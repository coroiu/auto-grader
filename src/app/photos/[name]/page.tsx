import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPhoto } from '@/lib/processing';
import { PhotoComparison } from './PhotoComparison';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function PhotoPage({ params }: PageProps) {
  const { name } = await params;
  const photo = await getPhoto(name);

  if (!photo) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          &larr; Back to Gallery
        </Link>
        <h1 className="text-2xl font-bold">{photo.name}</h1>
        {photo.metadata && (
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
            {photo.metadata.camera && <span>{photo.metadata.camera}</span>}
            {photo.metadata.lens && <span>{photo.metadata.lens}</span>}
            {photo.metadata.focalLength && (
              <span>{photo.metadata.focalLength}</span>
            )}
            {photo.metadata.aperture && <span>{photo.metadata.aperture}</span>}
            {photo.metadata.shutterSpeed && (
              <span>{photo.metadata.shutterSpeed}</span>
            )}
            {photo.metadata.iso && <span>{photo.metadata.iso}</span>}
          </div>
        )}
      </header>

      <PhotoComparison photo={photo} />
    </main>
  );
}
