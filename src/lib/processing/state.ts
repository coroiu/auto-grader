import { promises as fs } from 'fs';
import path from 'path';
import { config } from './config';

export interface PhotoState {
  name: string;
  outputDir: string;
  isProcessing: boolean;
  isComplete: boolean;
  hasMetadata: boolean;
  hasThumbnail: boolean;
  hasOriginal: boolean;
  appliedLuts: string[];
  missingLuts: string[];
}

export interface Photo {
  name: string;
  outputDir: string;
  metadata: PhotoMetadata | null;
  thumbnailUrl: string;
  variants: PhotoVariant[];
}

export interface PhotoMetadata {
  captureDate?: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  width?: number;
  height?: number;
}

export interface PhotoVariant {
  name: string;
  filename: string;
  url: string;
}

/**
 * Get the output directory path for a photo
 */
export function getPhotoOutputDir(photoName: string): string {
  return path.join(config.outputDir, photoName);
}

/**
 * Get available LUT files from the luts directory
 */
export async function getAvailableLuts(): Promise<string[]> {
  try {
    const files = await fs.readdir(config.lutsDir);
    return files
      .filter((f) => f.toLowerCase().endsWith('.cube'))
      .map((f) => path.basename(f, path.extname(f)));
  } catch {
    return [];
  }
}

/**
 * Check the processing state of a photo
 */
export async function getPhotoState(photoName: string): Promise<PhotoState> {
  const outputDir = getPhotoOutputDir(photoName);
  const availableLuts = await getAvailableLuts();

  const state: PhotoState = {
    name: photoName,
    outputDir,
    isProcessing: false,
    isComplete: false,
    hasMetadata: false,
    hasThumbnail: false,
    hasOriginal: false,
    appliedLuts: [],
    missingLuts: [...availableLuts],
  };

  try {
    await fs.access(outputDir);
  } catch {
    // Directory doesn't exist - photo is pending
    return state;
  }

  // Check for processing marker
  try {
    await fs.access(path.join(outputDir, config.processingMarker));
    state.isProcessing = true;
    return state;
  } catch {
    // No processing marker
  }

  // Check for metadata
  try {
    await fs.access(path.join(outputDir, config.metadataFile));
    state.hasMetadata = true;
  } catch {
    // No metadata
  }

  // Check for thumbnail
  try {
    await fs.access(path.join(outputDir, config.thumbnailFile));
    state.hasThumbnail = true;
  } catch {
    // No thumbnail
  }

  // Check for original
  try {
    await fs.access(path.join(outputDir, config.originalFile));
    state.hasOriginal = true;
  } catch {
    // No original
  }

  // Check for LUT outputs
  const appliedLuts: string[] = [];
  const missingLuts: string[] = [];

  for (const lut of availableLuts) {
    const lutOutputPath = path.join(outputDir, `${lut}.jpg`);
    try {
      await fs.access(lutOutputPath);
      appliedLuts.push(lut);
    } catch {
      missingLuts.push(lut);
    }
  }

  state.appliedLuts = appliedLuts;
  state.missingLuts = missingLuts;

  // Photo is complete if it has all outputs
  state.isComplete =
    state.hasMetadata &&
    state.hasThumbnail &&
    state.hasOriginal &&
    missingLuts.length === 0;

  return state;
}

/**
 * Get all photos from the output directory
 */
export async function getPhotos(): Promise<Photo[]> {
  try {
    const entries = await fs.readdir(config.outputDir, { withFileTypes: true });
    const photos: Photo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const photoName = entry.name;
      const state = await getPhotoState(photoName);

      // Skip photos still processing
      if (state.isProcessing) continue;

      // Load metadata if available
      let metadata: PhotoMetadata | null = null;
      if (state.hasMetadata) {
        try {
          const metadataPath = path.join(state.outputDir, config.metadataFile);
          const content = await fs.readFile(metadataPath, 'utf-8');
          metadata = JSON.parse(content);
        } catch {
          // Ignore metadata errors
        }
      }

      // Build variants list
      const variants: PhotoVariant[] = [];

      if (state.hasOriginal) {
        variants.push({
          name: 'Original',
          filename: config.originalFile,
          url: `/api/photos/${photoName}/${config.originalFile}`,
        });
      }

      for (const lut of state.appliedLuts) {
        variants.push({
          name: lut,
          filename: `${lut}.jpg`,
          url: `/api/photos/${photoName}/${lut}.jpg`,
        });
      }

      photos.push({
        name: photoName,
        outputDir: state.outputDir,
        metadata,
        thumbnailUrl: `/api/photos/${photoName}/${config.thumbnailFile}`,
        variants,
      });
    }

    // Sort by capture date (newest first) or name
    photos.sort((a, b) => {
      const dateA = a.metadata?.captureDate || '';
      const dateB = b.metadata?.captureDate || '';
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.name.localeCompare(b.name);
    });

    return photos;
  } catch {
    return [];
  }
}

/**
 * Get a single photo by name
 */
export async function getPhoto(name: string): Promise<Photo | null> {
  const state = await getPhotoState(name);

  if (state.isProcessing) return null;

  // Check if directory exists
  try {
    await fs.access(state.outputDir);
  } catch {
    return null;
  }

  // Load metadata if available
  let metadata: PhotoMetadata | null = null;
  if (state.hasMetadata) {
    try {
      const metadataPath = path.join(state.outputDir, config.metadataFile);
      const content = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(content);
    } catch {
      // Ignore metadata errors
    }
  }

  // Build variants list
  const variants: PhotoVariant[] = [];

  if (state.hasOriginal) {
    variants.push({
      name: 'Original',
      filename: config.originalFile,
      url: `/api/photos/${name}/${config.originalFile}`,
    });
  }

  for (const lut of state.appliedLuts) {
    variants.push({
      name: lut,
      filename: `${lut}.jpg`,
      url: `/api/photos/${name}/${lut}.jpg`,
    });
  }

  return {
    name,
    outputDir: state.outputDir,
    metadata,
    thumbnailUrl: `/api/photos/${name}/${config.thumbnailFile}`,
    variants,
  };
}

/**
 * Scan for photos that need processing
 */
export async function scanForPendingWork(): Promise<
  { photoName: string; rawPath: string; missingLuts: string[] }[]
> {
  const pendingWork: {
    photoName: string;
    rawPath: string;
    missingLuts: string[];
  }[] = [];

  try {
    // Check inbox for new RAW files
    const inboxFiles = await fs.readdir(config.inboxDir);

    for (const file of inboxFiles) {
      const ext = path.extname(file);
      if (!config.rawExtensions.includes(ext)) continue;

      const photoName = path.basename(file, ext);
      const rawPath = path.join(config.inboxDir, file);
      const state = await getPhotoState(photoName);

      // If processing or has missing LUTs, add to pending
      if (!state.isComplete && !state.isProcessing) {
        console.log(
          `[STATE] ${photoName} needs processing: ` +
            `isComplete=${state.isComplete}, hasOriginal=${state.hasOriginal}, ` +
            `hasThumbnail=${state.hasThumbnail}, hasMetadata=${state.hasMetadata}, ` +
            `appliedLuts=${state.appliedLuts.length}, missingLuts=${state.missingLuts.length}`
        );
        pendingWork.push({
          photoName,
          rawPath,
          missingLuts: state.hasOriginal ? state.missingLuts : [],
        });
      }
    }

    // Also check for existing photos that might need new LUTs
    const outputEntries = await fs.readdir(config.outputDir, {
      withFileTypes: true,
    });

    for (const entry of outputEntries) {
      if (!entry.isDirectory()) continue;

      const photoName = entry.name;

      // Skip if already in pending (from inbox check)
      if (pendingWork.some((p) => p.photoName === photoName)) continue;

      const state = await getPhotoState(photoName);

      // If has missing LUTs and not processing, need to reprocess
      if (state.missingLuts.length > 0 && !state.isProcessing) {
        // Find the original RAW file
        for (const ext of config.rawExtensions) {
          const rawPath = path.join(config.inboxDir, `${photoName}${ext}`);
          try {
            await fs.access(rawPath);
            pendingWork.push({
              photoName,
              rawPath,
              missingLuts: state.missingLuts,
            });
            break;
          } catch {
            // RAW not found with this extension
          }
        }
      }
    }
  } catch {
    // Directories might not exist yet
  }

  return pendingWork;
}
