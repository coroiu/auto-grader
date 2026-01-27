import { promises as fs } from 'fs';
import path from 'path';
import { config } from './config';
import { getPhotoState, getAvailableLuts, getPhotoOutputDir } from './state';
import { convertRawToTiff, convertTiffToJpg, createThumbnail } from './raw';
import { applyLuts } from './lut';
import { extractMetadata, saveMetadata } from './metadata';

export interface ProcessingResult {
  photoName: string;
  success: boolean;
  error?: string;
  appliedLuts: string[];
  failedLuts: string[];
}

/**
 * Process a single photo: RAW → TIFF → JPGs (original + LUTs)
 */
export async function processPhoto(
  rawPath: string,
  photoName: string,
  onlyLuts?: string[]
): Promise<ProcessingResult> {
  const outputDir = getPhotoOutputDir(photoName);
  const processingMarkerPath = path.join(outputDir, config.processingMarker);
  const tiffPath = path.join(outputDir, 'temp.tif');

  const result: ProcessingResult = {
    photoName,
    success: false,
    appliedLuts: [],
    failedLuts: [],
  };

  try {
    // Get current state BEFORE creating processing marker
    // (otherwise getPhotoState returns early with all LUTs marked as missing)
    const state = await getPhotoState(photoName);
    const availableLuts = await getAvailableLuts();
    const lutsToApply = onlyLuts || state.missingLuts;

    // Check if there's actually work to do
    if (state.isComplete) {
      console.log(`[PIPELINE] Skipping ${photoName}: already complete`);
      result.success = true;
      return result;
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Create processing marker
    await fs.writeFile(processingMarkerPath, new Date().toISOString());

    console.log(
      `[PIPELINE] Processing ${photoName}: ` +
        `hasOriginal=${state.hasOriginal}, hasThumbnail=${state.hasThumbnail}, ` +
        `appliedLuts=${state.appliedLuts.length}, missingLuts=${lutsToApply.length}`
    );

    // Step 1: Extract metadata (if not already done)
    if (!state.hasMetadata) {
      try {
        const metadata = await extractMetadata(rawPath);
        const metadataPath = path.join(outputDir, config.metadataFile);
        await saveMetadata(metadata, metadataPath);
      } catch (err) {
        console.error(
          `[PIPELINE] Failed to extract metadata: ${err instanceof Error ? err.message : err}`
        );
        // Continue processing even if metadata extraction fails
      }
    }

    // Step 2: Convert RAW to TIFF (needed for any image output)
    const needsConversion =
      !state.hasOriginal || !state.hasThumbnail || lutsToApply.length > 0;

    if (needsConversion) {
      await convertRawToTiff(rawPath, tiffPath);
    }

    // Step 3: Create original JPG (if not already done)
    if (!state.hasOriginal) {
      const originalPath = path.join(outputDir, config.originalFile);
      await convertTiffToJpg(tiffPath, originalPath, config.jpgQuality);
    }

    // Step 4: Create thumbnail (if not already done)
    if (!state.hasThumbnail) {
      const originalPath = path.join(outputDir, config.originalFile);
      const thumbnailPath = path.join(outputDir, config.thumbnailFile);
      await createThumbnail(originalPath, thumbnailPath, config.thumbnailWidth);
    }

    // Step 5: Apply LUTs
    if (lutsToApply.length > 0 && availableLuts.length > 0) {
      const lutResults = await applyLuts(
        tiffPath,
        lutsToApply,
        outputDir,
        config.jpgQuality
      );

      for (const lutResult of lutResults) {
        if (lutResult.success) {
          result.appliedLuts.push(lutResult.lut);
        } else {
          result.failedLuts.push(lutResult.lut);
        }
      }
    }

    // Cleanup: Remove temporary TIFF
    try {
      await fs.unlink(tiffPath);
    } catch {
      // Ignore cleanup errors
    }

    // Remove processing marker
    await fs.unlink(processingMarkerPath);

    result.success = result.failedLuts.length === 0;
    console.log(
      `[PIPELINE] Completed ${photoName}: ${result.appliedLuts.length} LUTs applied, ${result.failedLuts.length} failed`
    );

    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    console.error(`[PIPELINE] Failed to process ${photoName}: ${result.error}`);

    // Try to remove processing marker on failure
    try {
      await fs.unlink(processingMarkerPath);
    } catch {
      // Ignore
    }

    // Try to clean up temp TIFF on failure
    try {
      await fs.unlink(tiffPath);
    } catch {
      // Ignore
    }

    return result;
  }
}

/**
 * Clean up stale processing markers (from crashed processes)
 */
export async function cleanupStaleMarkers(): Promise<string[]> {
  const cleaned: string[] = [];

  try {
    const entries = await fs.readdir(config.outputDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const markerPath = path.join(
        config.outputDir,
        entry.name,
        config.processingMarker
      );

      try {
        const stat = await fs.stat(markerPath);
        const ageMs = Date.now() - stat.mtimeMs;

        // If marker is older than 1 hour, consider it stale
        if (ageMs > 60 * 60 * 1000) {
          await fs.unlink(markerPath);
          cleaned.push(entry.name);
          console.log(`[PIPELINE] Cleaned stale marker for ${entry.name}`);
        }
      } catch {
        // No marker or can't access
      }
    }
  } catch {
    // Output directory might not exist
  }

  return cleaned;
}
