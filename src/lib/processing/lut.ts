import { spawn } from 'child_process';
import path from 'path';
import { config } from './config';

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Apply a LUT to an image using FFmpeg (single attempt)
 */
async function applyLutOnce(
  inputPath: string,
  lutName: string,
  outputPath: string,
  quality: number = 95
): Promise<void> {
  const lutPath = path.join(config.lutsDir, `${lutName}.cube`);

  return new Promise((resolve, reject) => {
    // FFmpeg command: apply 3D LUT and convert to JPG
    // The lut3d filter applies the .cube LUT file
    const args = [
      '-y',
      '-i',
      inputPath,
      '-vf',
      `lut3d=${lutPath}`,
      '-q:v',
      Math.round((100 - quality) / 3.33).toString(),
      outputPath,
    ];

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
          new Error(
            `ffmpeg lut3d exited with code ${code}: ${stderr.slice(0, 500)}`
          )
        );
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

/**
 * Apply a LUT to an image using FFmpeg with retry logic
 */
export async function applyLut(
  inputPath: string,
  lutName: string,
  outputPath: string,
  quality: number = 95
): Promise<void> {
  const maxRetries = config.lutRetries;
  const baseDelay = config.lutRetryDelayMs;

  console.log(`[LUT] Applying ${lutName} to ${path.basename(inputPath)}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await applyLutOnce(inputPath, lutName, outputPath, quality);
      console.log(`[LUT] Applied ${lutName} successfully`);
      return;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const error = err instanceof Error ? err.message : String(err);

      if (isLastAttempt) {
        console.error(`[LUT] Failed to apply ${lutName} after ${maxRetries} attempts: ${error}`);
        throw err;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[LUT] Attempt ${attempt}/${maxRetries} failed for ${lutName}, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

/**
 * Apply multiple LUTs to an image sequentially to avoid FFmpeg race conditions
 */
export async function applyLuts(
  inputPath: string,
  lutNames: string[],
  outputDir: string,
  quality: number = 95
): Promise<{ lut: string; success: boolean; error?: string }[]> {
  const results: { lut: string; success: boolean; error?: string }[] = [];

  // Process LUTs sequentially to avoid FFmpeg race conditions
  for (const lutName of lutNames) {
    const outputPath = path.join(outputDir, `${lutName}.jpg`);
    try {
      await applyLut(inputPath, lutName, outputPath, quality);
      results.push({ lut: lutName, success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[LUT] Failed to apply ${lutName}: ${error}`);
      results.push({ lut: lutName, success: false, error });
    }
  }

  return results;
}
