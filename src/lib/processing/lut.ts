import { spawn } from 'child_process';
import path from 'path';
import { config } from './config';

/**
 * Apply a LUT to an image using FFmpeg
 */
export async function applyLut(
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

    console.log(`[LUT] Applying ${lutName} to ${path.basename(inputPath)}...`);

    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[LUT] Applied ${lutName} successfully`);
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
 * Apply multiple LUTs to an image in parallel
 */
export async function applyLuts(
  inputPath: string,
  lutNames: string[],
  outputDir: string,
  quality: number = 95
): Promise<{ lut: string; success: boolean; error?: string }[]> {
  const results = await Promise.all(
    lutNames.map(async (lutName) => {
      const outputPath = path.join(outputDir, `${lutName}.jpg`);
      try {
        await applyLut(inputPath, lutName, outputPath, quality);
        return { lut: lutName, success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[LUT] Failed to apply ${lutName}: ${error}`);
        return { lut: lutName, success: false, error };
      }
    })
  );

  return results;
}
