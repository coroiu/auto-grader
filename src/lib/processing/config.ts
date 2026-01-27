import path from 'path';

export const config = {
  dataDir: process.env.DATA_DIR || './data',
  concurrency: parseInt(process.env.CONCURRENCY || '2', 10),
  jpgQuality: parseInt(process.env.JPG_QUALITY || '95', 10),

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
};
