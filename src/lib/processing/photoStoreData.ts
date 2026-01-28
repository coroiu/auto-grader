import type { Photo } from './state';

// In-memory photo store - data only, no chokidar dependency
let photos: Map<string, Photo> = new Map();
let initialized = false;

/**
 * Check if the photo store is initialized
 */
export function isPhotoStoreInitialized(): boolean {
  return initialized;
}

/**
 * Set the initialized state
 */
export function setPhotoStoreInitialized(value: boolean): void {
  initialized = value;
}

/**
 * Get all photos from the in-memory store (fast retrieval)
 */
export function getPhotosFromStore(): Photo[] {
  if (!initialized) {
    console.warn('[PHOTO_STORE] Store not initialized, returning empty array');
    return [];
  }

  // Return sorted array (newest first)
  return Array.from(photos.values()).sort((a, b) => {
    const dateA = a.metadata?.captureDate || '';
    const dateB = b.metadata?.captureDate || '';
    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get the photos map directly (for internal use by photoStore)
 */
export function getPhotosMap(): Map<string, Photo> {
  return photos;
}

/**
 * Set a photo in the store
 */
export function setPhoto(name: string, photo: Photo): void {
  photos.set(name, photo);
}

/**
 * Delete a photo from the store
 */
export function deletePhoto(name: string): boolean {
  return photos.delete(name);
}

/**
 * Check if a photo exists in the store
 */
export function hasPhoto(name: string): boolean {
  return photos.has(name);
}

/**
 * Clear all photos from the store
 */
export function clearPhotos(): void {
  photos.clear();
  initialized = false;
}

/**
 * Replace all photos in the store
 */
export function setAllPhotos(newPhotos: Photo[]): void {
  photos = new Map(newPhotos.map((p) => [p.name, p]));
}
