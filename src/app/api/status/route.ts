import { NextResponse } from 'next/server';
import { processingQueue, getAvailableLuts, getPhotos } from '@/lib/processing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const queueStatus = processingQueue.getStatus();
    const luts = await getAvailableLuts();
    const photos = await getPhotos();

    return NextResponse.json({
      queue: queueStatus,
      lutsCount: luts.length,
      luts,
      photosCount: photos.length,
    });
  } catch (error) {
    console.error('[API] Failed to get status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
