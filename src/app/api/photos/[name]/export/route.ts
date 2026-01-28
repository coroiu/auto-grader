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

    // Exposure adjustment for sRGB images
    // The TIFF from darktable is sRGB gamma-corrected, so we need to:
    // 1. Convert to linear (approximate with gamma=2.2)
    // 2. Apply exposure multiplier
    // 3. Convert back to sRGB (approximate with gamma=1/2.2)
    //
    // Using the 'curves' filter with 'all' channel and a power function
    // For exposure adjustment: output = input^(1/2.2) * multiplier)^2.2
    // Simplified using eq filter's gamma: gamma adjustment can approximate this
    //
    // The 'eq' filter gamma works on the whole image:
    // - gamma < 1 = brighter (like positive exposure)
    // - gamma > 1 = darker (like negative exposure)
    //
    // For proper EV adjustment in sRGB: gamma ≈ 1 / (2^(exposure * 0.5))
    // This is an approximation that works reasonably well for sRGB content

    if (exposure !== 0) {
      // Approximate EV adjustment using gamma
      // This isn't perfect but is close for typical adjustments
      const gamma = Math.pow(2, -exposure * 0.45);
      filters.push(`eq=gamma=${gamma.toFixed(4)}`);
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
