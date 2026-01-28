// Re-export processing modules that are safe for all contexts (no chokidar)
export { config } from './config';
export { getPhotos, getPhoto, getPhotoState, getAvailableLuts } from './state';
export type { Photo, PhotoMetadata, PhotoVariant, PhotoState } from './state';
export { processPhoto, cleanupStaleMarkers } from './pipeline';
export type { ProcessingResult } from './pipeline';
export { processingQueue } from './queue';
export type { QueueJob, QueueStatus } from './queue';
// Photo store getters (safe to import anywhere - no chokidar dependency)
export { getPhotosFromStore, isPhotoStoreInitialized } from './photoStoreData';

// NOTE: Do NOT export from watcher.ts or photoStore.ts here!
// Those modules use chokidar which causes webpack bundling issues.
// Import them directly where needed (e.g., instrumentation.ts, API routes that need rescan)
