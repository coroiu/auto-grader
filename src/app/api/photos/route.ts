import { NextResponse } from 'next/server';
import { getPhotos } from '@/lib/processing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const photos = await getPhotos();
    return NextResponse.json(photos);
  } catch (error) {
    console.error('[API] Failed to get photos:', error);
    return NextResponse.json(
      { error: 'Failed to get photos' },
      { status: 500 }
    );
  }
}
