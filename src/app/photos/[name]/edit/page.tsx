import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPhoto, getAvailableLuts } from '@/lib/processing';
import { EditPageClient } from './EditPageClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function EditPage({ params }: PageProps) {
  const { name } = await params;
  const [photo, lutNames] = await Promise.all([getPhoto(name), getAvailableLuts()]);

  if (!photo) {
    notFound();
  }

  // Build LUT info with URLs
  const luts = lutNames.map((lutName) => ({
    name: lutName,
    url: `/api/luts/${encodeURIComponent(lutName)}.cube`,
  }));

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/photos/${photo.name}`}
            className="text-blue-400 hover:text-blue-300"
          >
            &larr; Back to Comparison
          </Link>
          <span className="text-gray-600">|</span>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Gallery
          </Link>
        </div>
        <h1 className="text-2xl font-bold">{photo.name}</h1>
        <p className="text-gray-400 mt-1">Advanced Editor</p>
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

      <EditPageClient photoName={photo.name} luts={luts} metadata={photo.metadata} />
    </main>
  );
}
