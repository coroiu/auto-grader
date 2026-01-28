import { NextResponse } from 'next/server';
// Import directly from watcher to avoid issues with barrel file
import { rescan } from '@/lib/processing/watcher';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const count = await rescan();
    return NextResponse.json({
      message: `Rescan complete`,
      pendingJobs: count,
    });
  } catch (error) {
    console.error('[API] Failed to rescan:', error);
    return NextResponse.json({ error: 'Failed to rescan' }, { status: 500 });
  }
}
