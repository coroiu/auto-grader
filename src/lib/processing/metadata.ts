import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import type { PhotoMetadata } from './state';

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

        console.log(`[EXIF] Extracted metadata for ${path.basename(rawPath)}`);
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
