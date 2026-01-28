import { Gallery } from '@/components/Gallery';
import { StatusBar } from '@/components/StatusBar';
// Import directly from state to avoid pulling in chokidar via watcher.ts
import { getPhotos } from '@/lib/processing/state';

// Use revalidate = 0 to always fetch fresh data from in-memory store
// The photo store provides instant responses so this is fast
export const revalidate = 0;

export default async function Home() {
  const photos = await getPhotos();

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auto Grader</h1>
            <p className="text-gray-400 mt-2">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} processed
            </p>
          </div>
          <StatusBar />
        </div>
      </header>
      <Gallery photos={photos} />
    </main>
  );
}
