import chokidar from 'chokidar';
import path from 'path';
import { config } from './config';
import { processingQueue } from './queue';
import { scanForPendingWork } from './state';
import { cleanupStaleMarkers } from './pipeline';

let watcher: chokidar.FSWatcher | null = null;

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
}

/**
 * Stop the file watcher
 */
export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
    console.log('[WATCHER] Stopped');
  }
}

/**
 * Trigger a rescan for pending work (e.g., after adding new LUTs)
 */
export async function rescan(): Promise<number> {
  console.log('[WATCHER] Rescanning for pending work...');

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
