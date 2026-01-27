import { spawn } from 'child_process';
import path from 'path';

/**
 * Convert RAW file to TIFF using darktable-cli
 */
export async function convertRawToTiff(
  rawPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use the output directory as a unique config directory per photo
    // This prevents database lock conflicts when processing multiple photos concurrently
    const configDir = path.dirname(outputPath);

    // darktable-cli <input> <output> [options]
    // Using 16-bit TIFF for maximum quality before LUT application
    // --apply-custom-presets false is needed for concurrent instances
    const args = [
      rawPath,
      outputPath,
      '--apply-custom-presets',
      'false',
      '--out-ext',
      'tif',
      '--core',
      '--conf',
      'plugins/imageio/format/tiff/bpp=16',
    ];

    console.log(`[RAW] Converting ${path.basename(rawPath)} to TIFF...`);

    // Set DARKTABLE_CONFIGDIR to isolate each instance
    const env = {
      ...process.env,
      DARKTABLE_CONFIGDIR: configDir,
    };

    const proc = spawn('darktable-cli', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[RAW] Converted ${path.basename(rawPath)} successfully`);
        resolve();
      } else {
        reject(
          new Error(
            `darktable-cli exited with code ${code}: ${stderr.slice(0, 500)}`
          )
        );
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn darktable-cli: ${err.message}`));
    });
  });
}

/**
 * Convert TIFF to JPG using FFmpeg (without LUT)
 */
export async function convertTiffToJpg(
  tiffPath: string,
  outputPath: string,
  quality: number = 95
): Promise<void> {
  return new Promise((resolve, reject) => {
    // FFmpeg command: convert TIFF to JPG
    const args = [
      '-y', // Overwrite output
      '-i',
      tiffPath,
      '-q:v',
      Math.round((100 - quality) / 3.33).toString(), // FFmpeg uses 2-31 scale (lower is better)
      outputPath,
    ];

    console.log(`[RAW] Converting TIFF to JPG: ${path.basename(outputPath)}`);

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
 * Create thumbnail from JPG
 */
export async function createThumbnail(
  inputPath: string,
  outputPath: string,
  width: number = 400
): Promise<void> {
  return new Promise((resolve, reject) => {
    // FFmpeg command: resize to thumbnail
    const args = [
      '-y',
      '-i',
      inputPath,
      '-vf',
      `scale=${width}:-1`,
      '-q:v',
      '5', // Lower quality for thumbnails
      outputPath,
    ];

    console.log(`[RAW] Creating thumbnail: ${path.basename(outputPath)}`);

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
