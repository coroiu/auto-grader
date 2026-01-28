import { NextResponse } from 'next/server';
import { getAvailableLuts } from '@/lib/processing/state';

export const dynamic = 'force-dynamic';

/**
 * GET /api/luts
 * List all available LUTs with their URLs for browser-based editing.
 */
export async function GET() {
  try {
    const lutNames = await getAvailableLuts();

    const luts = lutNames.map((name) => ({
      name,
      url: `/api/luts/${encodeURIComponent(name)}.cube`,
    }));

    return NextResponse.json(luts, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('[API] Failed to list LUTs:', error);
    return NextResponse.json({ error: 'Failed to list LUTs' }, { status: 500 });
  }
}
