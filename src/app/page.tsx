import { Gallery } from '@/components/Gallery';
import { getPhotos } from '@/lib/processing/state';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const photos = await getPhotos();

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Auto Grader</h1>
        <p className="text-gray-400 mt-2">
          {photos.length} photos processed
        </p>
      </header>
      <Gallery photos={photos} />
    </main>
  );
}
