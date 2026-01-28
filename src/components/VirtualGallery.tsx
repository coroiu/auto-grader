'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Photo } from '@/lib/processing';

interface VirtualGalleryProps {
  photos: Photo[];
}

type VirtualRow =
  | { type: 'header'; date: string }
  | { type: 'photos'; photos: Photo[] };

const HEADER_HEIGHT = 48;
const GAP = 16; // gap-4 = 1rem = 16px
// Footer: p-3 (24px padding) + text-sm (~20px) + mt-1 (4px) + text-xs (~16px) = 64px
const FOOTER_HEIGHT = 64;

function groupByDate(photos: Photo[]): Record<string, Photo[]> {
  const groups: Record<string, Photo[]> = {};

  for (const photo of photos) {
    let dateKey = 'Unknown Date';

    if (photo.metadata?.captureDate) {
      const datePart = photo.metadata.captureDate.split(' ')[0];
      if (datePart) {
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

function buildVirtualRows(photos: Photo[], columnsPerRow: number): VirtualRow[] {
  const grouped = groupByDate(photos);
  const rows: VirtualRow[] = [];

  for (const [date, datePhotos] of Object.entries(grouped)) {
    rows.push({ type: 'header', date });
    // Chunk photos into rows of N columns
    for (let i = 0; i < datePhotos.length; i += columnsPerRow) {
      rows.push({ type: 'photos', photos: datePhotos.slice(i, i + columnsPerRow) });
    }
  }
  return rows;
}

function getPhotoRowHeight(containerWidth: number, columns: number): number {
  // Account for gaps between columns
  const totalGapWidth = GAP * (columns - 1);
  const cardWidth = (containerWidth - totalGapWidth) / columns;
  // aspect-[3/2] means width:height = 3:2, so height = width * (2/3)
  const imageHeight = cardWidth * (2 / 3);
  // Total row height = image + footer + gap below row
  return Math.ceil(imageHeight + FOOTER_HEIGHT + GAP);
}

export function VirtualGallery({ photos }: VirtualGalleryProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Responsive column count
  const isLarge = useMediaQuery('(min-width: 1280px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px)');

  const columns = isLarge ? 5 : isDesktop ? 4 : isTablet ? 3 : 2;

  // Measure container width
  useEffect(() => {
    if (!parentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(parentRef.current);
    // Set initial width
    setContainerWidth(parentRef.current.clientWidth);

    return () => observer.disconnect();
  }, []);

  const rows = useMemo(
    () => buildVirtualRows(photos, columns),
    [photos, columns]
  );

  const getRowHeight = useCallback(
    (index: number) => {
      if (containerWidth === 0) return 200;
      return rows[index].type === 'header'
        ? HEADER_HEIGHT
        : getPhotoRowHeight(containerWidth, columns);
    },
    [containerWidth, columns, rows]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getRowHeight,
    overscan: 3,
  });

  // Force remeasure when dimensions change
  useEffect(() => {
    if (containerWidth > 0) {
      virtualizer.measure();
    }
  }, [containerWidth, columns, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  // Show loading placeholder until we have a valid width
  if (containerWidth === 0) {
    return (
      <div ref={parentRef} className="h-[calc(100vh-12rem)] overflow-auto">
        <div className="animate-pulse text-gray-500">Loading gallery...</div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-12rem)] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.type === 'header' ? (
                <h2 className="text-xl font-semibold text-gray-300 py-2">
                  {row.date}
                </h2>
              ) : (
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: `${GAP}px`,
                  }}
                >
                  {row.photos.map((photo) => (
                    <PhotoCard key={photo.name} photo={photo} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
          loading="lazy"
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
