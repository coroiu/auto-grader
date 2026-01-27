import { NextRequest, NextResponse } from 'next/server';
import { getPhoto } from '@/lib/processing';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const photo = await getPhoto(name);

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    return NextResponse.json(photo);
  } catch (error) {
    console.error('[API] Failed to get photo:', error);
    return NextResponse.json(
      { error: 'Failed to get photo' },
      { status: 500 }
    );
  }
}
