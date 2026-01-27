'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Photo } from '@/lib/processing';

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

  // Group photos by date
  const groupedPhotos = groupByDate(photos);

  return (
    <div className="space-y-8">
      {Object.entries(groupedPhotos).map(([date, datePhotos]) => (
        <section key={date}>
          <h2 className="text-xl font-semibold mb-4 text-gray-300">{date}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {datePhotos.map((photo) => (
              <PhotoCard key={photo.name} photo={photo} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PhotoCard({ photo }: { photo: Photo }) {
  return (
    <Link
      href={`/photos/${photo.name}`}
      className="group block bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
    >
      <div className="aspect-[3/2] relative bg-gray-800">
        <Image
          src={photo.thumbnailUrl}
          alt={photo.name}
          fill
          className="object-cover group-hover:opacity-90 transition-opacity"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium truncate">{photo.name}</p>
        <p className="text-xs text-gray-500 mt-1">
          {photo.variants.length} variant{photo.variants.length !== 1 ? 's' : ''}
        </p>
      </div>
    </Link>
  );
}

function groupByDate(photos: Photo[]): Record<string, Photo[]> {
  const groups: Record<string, Photo[]> = {};

  for (const photo of photos) {
    let dateKey = 'Unknown Date';

    if (photo.metadata?.captureDate) {
      // Extract just the date part (YYYY-MM-DD)
      const datePart = photo.metadata.captureDate.split(' ')[0];
      if (datePart) {
        // Format as readable date
        const date = new Date(datePart);
        if (!isNaN(date.getTime())) {
          dateKey = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      }
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
  }

  return groups;
}
