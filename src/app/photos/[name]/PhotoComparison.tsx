'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Photo } from '@/lib/processing';

interface PhotoComparisonProps {
  photo: Photo;
}

export function PhotoComparison({ photo }: PhotoComparisonProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Initialize with first 2 variants (safe SSR default)
  // Will be updated on mount based on device
  const [selectedVariants, setSelectedVariants] = useState<string[]>(
    photo.variants.slice(0, 2).map((v) => v.name)
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentSlide, setCurrentSlide] = useState(0);

  // Update selection based on device after hydration
  useEffect(() => {
    if (!hasHydrated) {
      setHasHydrated(true);
      if (isMobile) {
        // Mobile: select all variants by default
        setSelectedVariants(photo.variants.map((v) => v.name));
      }
    }
  }, [hasHydrated, isMobile, photo.variants]);

  // Track current slide in carousel
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

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

  const handleVariantClick = (name: string, event: React.MouseEvent) => {
    if (isMobile) {
      // Mobile: toggle behavior
      toggleVariant(name);
      return;
    }

    // Desktop
    if (event.shiftKey) {
      // Shift+click: toggle (add/remove from selection)
      toggleVariant(name);
    } else {
      // Single click: replace selection
      setSelectedVariants([name]);
    }
  };

  const scrollTo = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
    }
  };

  const selectedPhotos = photo.variants.filter((v) =>
    selectedVariants.includes(v.name)
  );

  // Calculate grid columns based on selection count (desktop only)
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
            onClick={(e) => handleVariantClick(variant.name, e)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedVariants.includes(variant.name)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {variant.name}
          </button>
        ))}
        {!isMobile && (
          <span className="self-center text-xs text-gray-500 ml-2">
            Shift+click for multi-select
          </span>
        )}
      </div>

      {/* Mobile: Carousel view */}
      {isMobile && selectedPhotos.length > 0 && (
        <div>
          <div className="embla" ref={emblaRef}>
            <div className="embla__container">
              {selectedPhotos.map((variant) => (
                <div key={variant.name} className="embla__slide">
                  <div className="aspect-[3/2] relative bg-gray-900 rounded-lg overflow-hidden">
                    <Image
                      src={variant.url}
                      alt={`${photo.name} - ${variant.name}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority
                    />
                  </div>
                  <p className="text-center text-sm font-medium text-gray-300 mt-2">
                    {variant.name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          {selectedPhotos.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {selectedPhotos.map((variant, index) => (
                <button
                  key={variant.name}
                  onClick={() => scrollTo(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide
                      ? 'bg-blue-500'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to ${variant.name}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop: Grid view */}
      {!isMobile && (
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
      )}

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
