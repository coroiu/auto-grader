import chokidar from 'chokidar';
import path from 'path';
import { promises as fs } from 'fs';
import { config } from './config';
import type { Photo, PhotoMetadata, PhotoVariant } from './state';
import { getAvailableLuts } from './state';
import {
  isPhotoStoreInitialized,
  setPhotoStoreInitialized,
  setAllPhotos,
  setPhoto,
  deletePhoto,
  hasPhoto,
  clearPhotos,
  getPhotosMap,
} from './photoStoreData';

// Re-export getters from photoStoreData (these are safe to import anywhere)
export { isPhotoStoreInitialized, getPhotosFromStore } from './photoStoreData';

let outputWatcher: chokidar.FSWatcher | null = null;

/**
 * Initialize the photo store by scanning the filesystem once
 */
export async function initPhotoStore(): Promise<void> {
  if (isPhotoStoreInitialized()) {
    console.log('[PHOTO_STORE] Already initialized');
    return;
  }

  console.log('[PHOTO_STORE] Initializing...');
  const startTime = Date.now();

  try {
    const scannedPhotos = await scanAllPhotos();
    setAllPhotos(scannedPhotos);
    setPhotoStoreInitialized(true);

    const elapsed = Date.now() - startTime;
    console.log(
      `[PHOTO_STORE] Initialized with ${getPhotosMap().size} photos in ${elapsed}ms`
    );

    // Start watching the output directory for changes
    startOutputWatcher();
  } catch (error) {
    console.error('[PHOTO_STORE] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Scan all photos from the filesystem (used only during initialization)
 */
async function scanAllPhotos(): Promise<Photo[]> {
  const result: Photo[] = [];

  try {
    const entries = await fs.readdir(config.outputDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const photo = await loadSinglePhoto(entry.name);
      if (photo) {
        result.push(photo);
      }
    }

    // Sort by capture date (newest first) or name
    result.sort((a, b) => {
      const dateA = a.metadata?.captureDate || '';
      const dateB = b.metadata?.captureDate || '';
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.name.localeCompare(b.name);
    });
  } catch {
    // Output directory might not exist yet
  }

  return result;
}

/**
 * Load a single photo from the filesystem
 */
async function loadSinglePhoto(photoName: string): Promise<Photo | null> {
  const outputDir = path.join(config.outputDir, photoName);

  // Check if directory exists
  try {
    await fs.access(outputDir);
  } catch {
    return null;
  }

  // Check for processing marker - skip if still processing
  try {
    await fs.access(path.join(outputDir, config.processingMarker));
    return null; // Still processing
  } catch {
    // Not processing, continue
  }

  // Load metadata if available
  let metadata: PhotoMetadata | null = null;
  try {
    const metadataPath = path.join(outputDir, config.metadataFile);
    const content = await fs.readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(content);
  } catch {
    // No metadata or invalid
  }

  // Check which files exist
  const hasOriginal = await fileExists(
    path.join(outputDir, config.originalFile)
  );
  const hasThumbnail = await fileExists(
    path.join(outputDir, config.thumbnailFile)
  );

  // Get available LUTs and check which ones are applied
  const availableLuts = await getAvailableLuts();
  const appliedLuts: string[] = [];

  for (const lut of availableLuts) {
    if (await fileExists(path.join(outputDir, `${lut}.jpg`))) {
      appliedLuts.push(lut);
    }
  }

  // Build variants list
  const variants: PhotoVariant[] = [];

  if (hasOriginal) {
    variants.push({
      name: 'Original',
      filename: config.originalFile,
      url: `/api/photos/${photoName}/${config.originalFile}`,
    });
  }

  for (const lut of appliedLuts) {
    variants.push({
      name: lut,
      filename: `${lut}.jpg`,
      url: `/api/photos/${photoName}/${lut}.jpg`,
    });
  }

  // Only return photo if it has at least a thumbnail
  if (!hasThumbnail) {
    return null;
  }

  return {
    name: photoName,
    outputDir,
    metadata,
    thumbnailUrl: `/api/photos/${photoName}/${config.thumbnailFile}`,
    variants,
  };
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Start watching the output directory for changes
 */
function startOutputWatcher(): void {
  if (outputWatcher) {
    return;
  }

  console.log(`[PHOTO_STORE] Starting output watcher on ${config.outputDir}`);

  outputWatcher = chokidar.watch(config.outputDir, {
    ignored: /(^|[/\\])\../, // Ignore dotfiles except .processing
    persistent: true,
    ignoreInitial: true, // Don't fire for existing files
    depth: 2, // Watch subdirs for file changes
  });

  // When .processing marker is removed, refresh that photo
  outputWatcher.on('unlink', async (filePath) => {
    if (filePath.endsWith(config.processingMarker)) {
      const photoName = path.basename(path.dirname(filePath));
      console.log(`[PHOTO_STORE] Processing complete for ${photoName}`);
      await refreshPhoto(photoName);
    }
  });

  // When a photo folder is deleted, remove from store
  outputWatcher.on('unlinkDir', (dirPath) => {
    // Only handle immediate subdirectories of outputDir
    if (path.dirname(dirPath) === config.outputDir) {
      const photoName = path.basename(dirPath);
      if (hasPhoto(photoName)) {
        deletePhoto(photoName);
        console.log(`[PHOTO_STORE] Removed ${photoName} from store`);
      }
    }
  });

  // When a new directory is created, we don't immediately add it
  // because it will have a .processing marker. We wait for unlink of that marker.

  outputWatcher.on('error', (error) => {
    console.error('[PHOTO_STORE] Watcher error:', error);
  });

  outputWatcher.on('ready', () => {
    console.log('[PHOTO_STORE] Output watcher ready');
  });
}

/**
 * Refresh a single photo in the store
 */
async function refreshPhoto(photoName: string): Promise<void> {
  const photo = await loadSinglePhoto(photoName);
  if (photo) {
    setPhoto(photoName, photo);
    console.log(
      `[PHOTO_STORE] Updated ${photoName} (${photo.variants.length} variants)`
    );
  } else {
    // Photo might have been deleted or is still processing
    deletePhoto(photoName);
  }
}

/**
 * Stop the output watcher
 */
export async function stopPhotoStore(): Promise<void> {
  if (outputWatcher) {
    await outputWatcher.close();
    outputWatcher = null;
    console.log('[PHOTO_STORE] Output watcher stopped');
  }
  clearPhotos();
}

/**
 * Force refresh the entire store (useful after adding new LUTs)
 */
export async function refreshPhotoStore(): Promise<void> {
  console.log('[PHOTO_STORE] Refreshing entire store...');
  const startTime = Date.now();

  const scannedPhotos = await scanAllPhotos();
  setAllPhotos(scannedPhotos);

  const elapsed = Date.now() - startTime;
  console.log(`[PHOTO_STORE] Refreshed ${getPhotosMap().size} photos in ${elapsed}ms`);
}
