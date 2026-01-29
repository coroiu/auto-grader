import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { config } from '@/lib/processing';
import { convertRawToTiff } from '@/lib/processing/raw';

/**
 * Recursively search for a file in a directory
 */
async function findFileRecursively(
  dir: string,
  filename: string
): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const found = await findFileRecursively(fullPath, filename);
        if (found) return found;
      } else if (entry.name === filename) {
        return fullPath;
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return null;
}

export const dynamic = 'force-dynamic';

// Maximum execution time for export (5 minutes)
export const maxDuration = 300;

/**
 * Compute midtone-biased exposure curve value for a given sRGB input
 * Matches the WebGL shader implementation using Gaussian weighting
 */
function filmicExposureCurve(srgb: number, exposure: number): number {
  // sRGB to linear
  const linear =
    srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);

  // Calculate luminance (using grayscale approximation for per-channel curves)
  const lum = linear;

  // Gaussian weight function for midtone bias
  const center = 0.5;
  const sigma = 0.3;
  const minWeight = 0.6;

  // Calculate Gaussian falloff from center
  const gaussianFalloff = Math.exp(-Math.pow((lum - center) / sigma, 2.0));

  // Weight ranges from minWeight (at extremes) to 1.0 (at center)
  const weight = minWeight + (1.0 - minWeight) * gaussianFalloff;

  // Apply exposure with tonal weighting
  let exposed = linear * Math.pow(2, exposure * weight);

  // Luminance-based highlight compression (soft shoulder)
  const lumAfterExposure = exposed;

  const threshold = 0.8;
  const knee = 0.5;

  let lumMapped = lumAfterExposure;
  if (lumAfterExposure > threshold) {
    const x = (lumAfterExposure - threshold) / (1.0 - threshold);
    lumMapped = threshold + (1.0 - threshold) * (1.0 - Math.exp(-knee * x));
  }

  // Scale by luminance ratio
  const scale = lumAfterExposure > 0.001 ? lumMapped / lumAfterExposure : 1.0;
  exposed *= scale;

  // Clamp
  exposed = Math.max(0, Math.min(1, exposed));

  // Linear to sRGB
  const result =
    exposed <= 0.0031308
      ? exposed * 12.92
      : 1.055 * Math.pow(exposed, 1.0 / 2.4) - 0.055;

  return Math.max(0, Math.min(1, result));
}

/**
 * Generate FFmpeg curves filter for midtone-biased exposure
 * Returns a curves filter string with sampled points from the Gaussian-weighted curve
 */
function generateFilmicCurvesFilter(exposure: number): string {
  // Sample the curve at multiple points
  // Using 33 points for smoother Gaussian interpolation (was 17 before)
  const numPoints = 33;
  const points: string[] = [];

  for (let i = 0; i < numPoints; i++) {
    const input = i / (numPoints - 1);
    const output = filmicExposureCurve(input, exposure);
    // FFmpeg curves use format "x/y" where x and y are in [0, 1]
    points.push(`${input.toFixed(4)}/${output.toFixed(4)}`);
  }

  // Apply to all channels (RGB)
  return `curves=all='${points.join(' ')}'`;
}

/**
 * Execute an FFmpeg command and return a promise
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`ffmpeg exited with code ${code}: ${stderr.slice(0, 500)}`)
        );
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

/**
 * GET /api/photos/[name]/export
 * Export a full-resolution JPG with custom exposure and LUT settings.
 *
 * Query params:
 * - exposure: number (EV adjustment, e.g., -1.5, 0, 2.0)
 * - lut: string (LUT name, optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const tempFiles: string[] = [];

  try {
    const { name } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const exposure = parseFloat(searchParams.get('exposure') || '0');
    const lutName = searchParams.get('lut');

    // Sanitize inputs
    const safeName = path.basename(name);
    const safeLutName = lutName ? path.basename(lutName) : null;

    // Validate exposure range
    if (isNaN(exposure) || exposure < -5 || exposure > 5) {
      return NextResponse.json(
        { error: 'Invalid exposure value (must be -5 to +5)' },
        { status: 400 }
      );
    }

    // Find the RAW file (search recursively in case files are in subfolders)
    let rawPath: string | null = null;
    for (const ext of config.rawExtensions) {
      const filename = `${safeName}${ext}`;
      // First try direct path (faster)
      const directPath = path.join(config.inboxDir, filename);
      try {
        await fs.access(directPath);
        rawPath = directPath;
        break;
      } catch {
        // Try recursive search
        const found = await findFileRecursively(config.inboxDir, filename);
        if (found) {
          rawPath = found;
          break;
        }
      }
    }

    if (!rawPath) {
      return NextResponse.json(
        { error: 'RAW file not found in inbox' },
        { status: 404 }
      );
    }

    // Validate LUT if specified
    if (safeLutName) {
      const lutPath = path.join(config.lutsDir, `${safeLutName}.cube`);
      try {
        await fs.access(lutPath);
      } catch {
        return NextResponse.json(
          { error: 'LUT not found' },
          { status: 404 }
        );
      }
    }

    // Create temp directory for this export
    const outputDir = path.join(config.outputDir, safeName);
    const tempDir = path.join(outputDir, '.export-temp');
    await fs.mkdir(tempDir, { recursive: true });

    const tiffPath = path.join(tempDir, 'export.tif');
    const jpgPath = path.join(tempDir, 'export.jpg');
    tempFiles.push(tiffPath, jpgPath);

    console.log(
      `[EXPORT] Starting export for ${safeName}: exposure=${exposure}, lut=${safeLutName || 'none'}`
    );

    // Step 1: Convert RAW to full-resolution TIFF
    console.log('[EXPORT] Converting RAW to TIFF...');
    await convertRawToTiff(rawPath, tiffPath);

    // Step 2: Apply exposure and/or LUT using FFmpeg
    console.log('[EXPORT] Applying adjustments...');

    // Build filter chain
    const filters: string[] = [];

    // Midtone-biased exposure adjustment for sRGB images
    // Uses the same curve as the WebGL shader:
    // - Gaussian weighting centered on midtones (full effect)
    // - Reduced effect on highlights and shadows (60% minimum)
    // - Luminance-based highlight roll-off with soft shoulder
    // - Preserves color by applying curve to all RGB channels uniformly
    //
    // The curves filter samples the Gaussian-weighted tone mapping function
    // at 33 points to create a smooth approximation. This won't be pixel-perfect
    // compared to the preview, but professional tools (Lightroom, Capture One)
    // also have minor preview/export differences.

    if (exposure !== 0) {
      // Generate filmic curves filter
      filters.push(generateFilmicCurvesFilter(exposure));
    }

    // LUT application
    if (safeLutName) {
      const lutPath = path.join(config.lutsDir, `${safeLutName}.cube`);
      filters.push(`lut3d=${lutPath}`);
    }

    // Build FFmpeg command
    const ffmpegArgs = [
      '-y', // Overwrite output
      '-i', tiffPath,
    ];

    if (filters.length > 0) {
      ffmpegArgs.push('-vf', filters.join(','));
    }

    // Output as high-quality JPG
    ffmpegArgs.push(
      '-q:v',
      Math.round((100 - config.jpgQuality) / 3.33).toString(),
      jpgPath
    );

    await runFFmpeg(ffmpegArgs);

    // Read the result
    const jpgBuffer = await fs.readFile(jpgPath);

    // Clean up temp files
    try {
      await fs.unlink(tiffPath);
      await fs.unlink(jpgPath);
      await fs.rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }

    console.log(`[EXPORT] Completed export for ${safeName}`);

    // Return the JPG
    return new NextResponse(jpgBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${safeName}-edited.jpg"`,
        'Cache-Control': 'no-store', // Don't cache exports
      },
    });
  } catch (error) {
    console.error('[EXPORT] Export failed:', error);

    // Clean up temp files on error
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
