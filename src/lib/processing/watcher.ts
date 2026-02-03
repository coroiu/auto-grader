import chokidar from 'chokidar';
import path from 'path';
import { promises as fs } from 'fs';
import { config } from './config';
import { processingQueue } from './queue';
import { scanForPendingWork, getPhotoOutputDir } from './state';
import { cleanupStaleMarkers } from './pipeline';
import { initPhotoStore, stopPhotoStore, refreshPhotoStore } from './photoStore';
import { updateMetadata, needsWBUpdate } from './metadata';
import type { PhotoMetadata } from './state';

let watcher: chokidar.FSWatcher | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start watching the inbox directory for new RAW files
 */
export async function startWatcher(): Promise<void> {
  if (watcher) {
    console.log('[WATCHER] Already running');
    return;
  }

  console.log(`[WATCHER] Starting to watch ${config.inboxDir}`);

  // Clean up any stale processing markers from previous crashes
  const cleaned = await cleanupStaleMarkers();
  if (cleaned.length > 0) {
    console.log(`[WATCHER] Cleaned ${cleaned.length} stale processing markers`);
  }

  // Initialize the photo store (scans filesystem once and starts output watcher)
  await initPhotoStore();

  // Scan for any pending work (files added while process was down)
  const pendingWork = await scanForPendingWork();
  if (pendingWork.length > 0) {
    console.log(`[WATCHER] Found ${pendingWork.length} pending items to process`);
    await processingQueue.addBatch(
      pendingWork.map((item) => ({
        photoName: item.photoName,
        rawPath: item.rawPath,
        onlyLuts: item.missingLuts.length > 0 ? item.missingLuts : undefined,
      }))
    );
  }

  // Start watching for new files
  watcher = chokidar.watch(config.inboxDir, {
    ignored: /(^|[/\\])\../, // Ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000, // Wait 2s for file to finish writing
      pollInterval: 100,
    },
  });

  watcher.on('add', async (filePath) => {
    const ext = path.extname(filePath);

    // Only process RAW files
    if (!config.rawExtensions.includes(ext)) {
      return;
    }

    const photoName = path.basename(filePath, ext);
    console.log(`[WATCHER] New RAW file detected: ${photoName}`);

    await processingQueue.add({
      photoName,
      rawPath: filePath,
    });
  });

  watcher.on('error', (error) => {
    console.error('[WATCHER] Error:', error);
  });

  watcher.on('ready', () => {
    console.log('[WATCHER] Ready and watching for new files');
  });

  // Start periodic stale marker cleanup
  cleanupInterval = setInterval(async () => {
    try {
      const cleaned = await cleanupStaleMarkers();
      if (cleaned.length > 0) {
        console.log(
          `[WATCHER] Periodic cleanup: removed ${cleaned.length} stale processing markers`
        );
      }
    } catch (err) {
      console.error(
        '[WATCHER] Periodic cleanup error:',
        err instanceof Error ? err.message : err
      );
    }
  }, config.staleMarkerCleanupIntervalMs);

  console.log(
    `[WATCHER] Stale marker cleanup scheduled every ${config.staleMarkerCleanupIntervalMs / 1000}s`
  );
}

/**
 * Stop the file watcher
 */
export async function stopWatcher(): Promise<void> {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[WATCHER] Stale marker cleanup stopped');
  }

  if (watcher) {
    await watcher.close();
    watcher = null;
    console.log('[WATCHER] Stopped');
  }

  // Stop the photo store watcher
  await stopPhotoStore();
}

/**
 * Re-extract metadata from RAW files for existing photos missing WB fields
 */
async function reextractMetadataForExistingPhotos(): Promise<number> {
  let updatedCount = 0;

  try {
    const inboxFiles = await fs.readdir(config.inboxDir);

    for (const file of inboxFiles) {
      const ext = path.extname(file);
      if (!config.rawExtensions.includes(ext)) continue;

      const photoName = path.basename(file, ext);
      const outputDir = getPhotoOutputDir(photoName);
      const metadataPath = path.join(outputDir, config.metadataFile);
      const rawPath = path.join(config.inboxDir, file);

      // Check if metadata.json exists
      try {
        const content = await fs.readFile(metadataPath, 'utf-8');
        const metadata: PhotoMetadata = JSON.parse(content);

        // Check if WB fields are missing
        if (needsWBUpdate(metadata)) {
          console.log(`[WATCHER] Updating metadata for ${photoName}`);
          await updateMetadata(rawPath, metadataPath);
          updatedCount++;
        }
      } catch {
        // metadata.json doesn't exist or is malformed, skip
      }
    }
  } catch (err) {
    console.error('[WATCHER] Metadata re-extraction error:', err);
  }

  if (updatedCount > 0) {
    console.log(`[WATCHER] Updated metadata for ${updatedCount} photos`);
    await refreshPhotoStore(); // Reload photos with new metadata
  }

  return updatedCount;
}

/**
 * Trigger a rescan for pending work (e.g., after adding new LUTs)
 */
export async function rescan(): Promise<number> {
  console.log('[WATCHER] Rescanning for pending work...');

  // Re-extract metadata for photos missing WB fields
  await reextractMetadataForExistingPhotos();

  // Refresh the photo store to pick up any changes (e.g., new LUTs, updated metadata)
  await refreshPhotoStore();

  const pendingWork = await scanForPendingWork();

  if (pendingWork.length > 0) {
    console.log(`[WATCHER] Found ${pendingWork.length} items to process`);
    await processingQueue.addBatch(
      pendingWork.map((item) => ({
        photoName: item.photoName,
        rawPath: item.rawPath,
        onlyLuts: item.missingLuts.length > 0 ? item.missingLuts : undefined,
      }))
    );
  } else {
    console.log('[WATCHER] No pending work found');
  }

  return pendingWork.length;
}
