import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/processing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/luts/[name]
 * Serve a .cube LUT file for browser-based editing.
 * The [name] parameter should include the .cube extension (e.g., "cinematic.cube")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Sanitize input to prevent directory traversal
    const safeName = path.basename(name);

    // Ensure it's a .cube file
    if (!safeName.toLowerCase().endsWith('.cube')) {
      return NextResponse.json(
        { error: 'Only .cube files are supported' },
        { status: 400 }
      );
    }

    const filePath = path.join(config.lutsDir, safeName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'LUT not found' }, { status: 404 });
    }

    // Read and serve the file
    const content = await fs.readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000, immutable', // LUTs don't change
      },
    });
  } catch (error) {
    console.error('[API] Failed to serve LUT:', error);
    return NextResponse.json({ error: 'Failed to serve LUT' }, { status: 500 });
  }
}
