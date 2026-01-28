import path from 'path';

export const config = {
  dataDir: process.env.DATA_DIR || './data',
  concurrency: parseInt(process.env.CONCURRENCY || '2', 10),
  jpgQuality: parseInt(process.env.JPG_QUALITY || '95', 10),

  // LUT retry settings
  lutRetries: parseInt(process.env.LUT_RETRIES || '3', 10),
  lutRetryDelayMs: parseInt(process.env.LUT_RETRY_DELAY_MS || '1000', 10),

  // Stale marker cleanup interval (ms)
  staleMarkerCleanupIntervalMs: parseInt(
    process.env.STALE_MARKER_CLEANUP_INTERVAL_MS || '300000',
    10
  ), // 5 minutes

  get inboxDir() {
    return path.join(this.dataDir, 'inbox');
  },

  get outputDir() {
    return path.join(this.dataDir, 'output');
  },

  get lutsDir() {
    return path.join(this.dataDir, 'luts');
  },

  // Supported RAW extensions
  rawExtensions: ['.arw', '.ARW'],

  // Processing marker file
  processingMarker: '.processing',

  // Output filenames
  metadataFile: 'metadata.json',
  thumbnailFile: 'thumb.jpg',
  originalFile: 'original.jpg',

  // Thumbnail size
  thumbnailWidth: 400,

  // Preview TIFF settings (for browser-based editing)
  previewFile: 'preview.tif',
  previewWidth: parseInt(process.env.PREVIEW_WIDTH || '1280', 10),
};
