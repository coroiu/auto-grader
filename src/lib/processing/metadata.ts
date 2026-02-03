import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import type { PhotoMetadata } from './state';

/**
 * Map Sony white balance mode names to Kelvin values
 */
function mapWhiteBalanceMode(mode: string): number {
  const wbModeMap: Record<string, number> = {
    'Daylight': 5500,
    'Cloudy': 6500,
    'Shade': 7500,
    'Tungsten': 3200,
    'Fluorescent': 4000,
    'Flash': 5500,
    'Custom': 0,  // Use ColorTemperature tag instead
    'Auto': 0,    // Use ColorTemperature if available
  };

  // Case-insensitive lookup
  const normalizedMode = Object.keys(wbModeMap).find(
    (key) => key.toLowerCase() === mode.toLowerCase()
  );

  if (normalizedMode) {
    return wbModeMap[normalizedMode];
  }

  // Log unmapped modes for future expansion
  console.log(`[EXIF] Unknown white balance mode: ${mode}`);
  return 0;
}

/**
 * Extract EXIF metadata from a RAW file using exiftool
 */
export async function extractMetadata(rawPath: string): Promise<PhotoMetadata> {
  return new Promise((resolve, reject) => {
    const args = [
      '-json',
      '-DateTimeOriginal',
      '-Model',
      '-LensModel',
      '-FocalLength',
      '-FNumber',
      '-ExposureTime',
      '-ISO',
      '-ImageWidth',
      '-ImageHeight',
      '-WhiteBalance',
      '-ColorTemperature',
      '-WBShiftAB_GM',
      rawPath,
    ];

    const proc = spawn('exiftool', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`exiftool exited with code ${code}: ${stderr.slice(0, 500)}`)
        );
        return;
      }

      try {
        const data = JSON.parse(stdout);
        if (!data || data.length === 0) {
          resolve({});
          return;
        }

        const exif = data[0];
        const metadata: PhotoMetadata = {};

        if (exif.DateTimeOriginal) {
          // Convert EXIF date format (YYYY:MM:DD HH:MM:SS) to ISO
          const dateStr = exif.DateTimeOriginal.replace(
            /^(\d{4}):(\d{2}):(\d{2})/,
            '$1-$2-$3'
          );
          metadata.captureDate = dateStr;
        }

        if (exif.Model) {
          metadata.camera = exif.Model;
        }

        if (exif.LensModel) {
          metadata.lens = exif.LensModel;
        }

        if (exif.FocalLength) {
          metadata.focalLength = exif.FocalLength;
        }

        if (exif.FNumber) {
          metadata.aperture = `f/${exif.FNumber}`;
        }

        if (exif.ExposureTime) {
          // Format as fraction if less than 1 second
          const exposure = parseFloat(exif.ExposureTime);
          if (exposure < 1) {
            metadata.shutterSpeed = `1/${Math.round(1 / exposure)}s`;
          } else {
            metadata.shutterSpeed = `${exposure}s`;
          }
        }

        if (exif.ISO) {
          metadata.iso = `ISO ${exif.ISO}`;
        }

        if (exif.ImageWidth) {
          metadata.width = exif.ImageWidth;
        }

        if (exif.ImageHeight) {
          metadata.height = exif.ImageHeight;
        }

        // Extract white balance metadata
        // Priority 1: ColorTemperature (direct Kelvin value)
        if (exif.ColorTemperature && exif.ColorTemperature > 0) {
          const kelvin = Number(exif.ColorTemperature);
          if (!isNaN(kelvin) && kelvin >= 2000 && kelvin <= 10000) {
            metadata.whiteBalanceKelvin = kelvin;
          } else if (!isNaN(kelvin)) {
            // Clamp out-of-range values
            metadata.whiteBalanceKelvin = Math.max(2000, Math.min(10000, kelvin));
            console.log(
              `[EXIF] ColorTemperature ${kelvin}K out of range, clamped to ${metadata.whiteBalanceKelvin}K`
            );
          }
        }

        // Priority 2: WhiteBalance mode name mapping
        if (!metadata.whiteBalanceKelvin && exif.WhiteBalance) {
          const kelvin = mapWhiteBalanceMode(exif.WhiteBalance);
          if (kelvin > 0) {
            metadata.whiteBalanceKelvin = kelvin;
          }
          // Store original mode for reference
          metadata.whiteBalanceMode = exif.WhiteBalance;
        } else if (exif.WhiteBalance) {
          // Store mode even if we got ColorTemperature
          metadata.whiteBalanceMode = exif.WhiteBalance;
        }

        // Extract tint from WBShiftAB_GM (Sony uses ±9 range)
        if (exif.WBShiftAB_GM) {
          // Handle both array and string formats
          let gmShift: number | undefined;

          if (Array.isArray(exif.WBShiftAB_GM) && exif.WBShiftAB_GM.length >= 2) {
            gmShift = Number(exif.WBShiftAB_GM[1]); // Second value is green-magenta
          } else if (typeof exif.WBShiftAB_GM === 'string') {
            // Parse string format like "0 3" or "+0 +3"
            const parts = exif.WBShiftAB_GM.trim().split(/\s+/);
            if (parts.length >= 2) {
              gmShift = Number(parts[1]);
            }
          }

          if (gmShift !== undefined && !isNaN(gmShift)) {
            // Normalize to ±1 range
            const normalizedTint = gmShift / 9.0;
            // Clamp to valid range
            metadata.whiteBalanceTint = Math.max(-1, Math.min(1, normalizedTint));
          }
        }

        console.log(
          `[EXIF] Extracted metadata for ${path.basename(rawPath)}` +
          (metadata.whiteBalanceKelvin ? ` (WB: ${metadata.whiteBalanceKelvin}K)` : '')
        );
        resolve(metadata);
      } catch (err) {
        reject(new Error(`Failed to parse exiftool output: ${err}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn exiftool: ${err.message}`));
    });
  });
}

/**
 * Save metadata to a JSON file
 */
export async function saveMetadata(
  metadata: PhotoMetadata,
  outputPath: string
): Promise<void> {
  await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
  console.log(`[EXIF] Saved metadata to ${path.basename(outputPath)}`);
}

/**
 * Re-extract metadata from RAW file and update metadata.json
 * Used to add WB fields to existing photos
 */
export async function updateMetadata(
  rawPath: string,
  metadataPath: string
): Promise<void> {
  const metadata = await extractMetadata(rawPath);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`[EXIF] Updated metadata for ${path.basename(rawPath)}`);
}

/**
 * Check if metadata.json is missing WB fields
 */
export function needsWBUpdate(metadata: PhotoMetadata): boolean {
  return (
    metadata.whiteBalanceKelvin === undefined &&
    metadata.whiteBalanceTint === undefined
  );
}
