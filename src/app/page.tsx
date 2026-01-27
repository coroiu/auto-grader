import { Gallery } from '@/components/Gallery';
import { StatusBar } from '@/components/StatusBar';
import { getPhotos } from '@/lib/processing';

export const dynamic = 'force-dynamic';

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
