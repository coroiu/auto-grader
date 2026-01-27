'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/lib/processing';

interface PhotoComparisonProps {
  photo: Photo;
}

export function PhotoComparison({ photo }: PhotoComparisonProps) {
  const [selectedVariants, setSelectedVariants] = useState<string[]>(
    photo.variants.slice(0, 2).map((v) => v.name)
  );

  const toggleVariant = (name: string) => {
    setSelectedVariants((prev) => {
      if (prev.includes(name)) {
        // Don't allow deselecting if only one is selected
        if (prev.length <= 1) return prev;
        return prev.filter((v) => v !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const selectedPhotos = photo.variants.filter((v) =>
    selectedVariants.includes(v.name)
  );

  // Calculate grid columns based on selection count
  const gridCols =
    selectedPhotos.length === 1
      ? 'grid-cols-1'
      : selectedPhotos.length === 2
        ? 'grid-cols-2'
        : selectedPhotos.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div>
      {/* Variant selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {photo.variants.map((variant) => (
          <button
            key={variant.name}
            onClick={() => toggleVariant(variant.name)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedVariants.includes(variant.name)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {variant.name}
          </button>
        ))}
      </div>

      {/* Comparison grid */}
      <div className={`grid ${gridCols} gap-4`}>
        {selectedPhotos.map((variant) => (
          <div key={variant.name} className="space-y-2">
            <div className="aspect-[3/2] relative bg-gray-900 rounded-lg overflow-hidden">
              <Image
                src={variant.url}
                alt={`${photo.name} - ${variant.name}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
            <p className="text-center text-sm font-medium text-gray-300">
              {variant.name}
            </p>
          </div>
        ))}
      </div>

      {/* Full-size download links */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Download</h3>
        <div className="flex flex-wrap gap-3">
          {photo.variants.map((variant) => (
            <a
              key={variant.name}
              href={variant.url}
              download={`${photo.name}-${variant.name}.jpg`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 transition-colors"
            >
              {variant.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
