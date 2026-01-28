'use client';

import type { Photo } from '@/lib/processing';
import { VirtualGallery } from './VirtualGallery';

interface GalleryProps {
  photos: Photo[];
}

export function Gallery({ photos }: GalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No photos yet</p>
        <p className="text-gray-500 mt-2">
          Drop RAW files into <code className="bg-gray-800 px-2 py-1 rounded">/data/inbox</code> to get started
        </p>
      </div>
    );
  }

  return <VirtualGallery photos={photos} />;
}
