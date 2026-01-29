import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/processing';

/**
 * Recursively search for a RAW file in a directory
 */
async function findRawFileRecursively(
  dir: string,
  baseName: string
): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const found = await findRawFileRecursively(fullPath, baseName);
        if (found) return found;
      } else {
        // Check if this file matches the base name (case-insensitive)
        const entryBaseName = path.basename(entry.name, path.extname(entry.name));
        if (entryBaseName.toLowerCase() === baseName.toLowerCase()) {
          // Additional check: must be a RAW file extension
          const ext = path.extname(entry.name).toLowerCase();
          if (['.arw', '.nef', '.cr2', '.cr3', '.dng', '.raf', '.orf', '.rw2'].includes(ext)) {
            return fullPath;
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return null;
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/photos/[name]/raw
 * Download the original RAW file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(name);

    // Search for RAW file in inbox (including subdirectories)
    const rawPath = await findRawFileRecursively(config.inboxDir, safeName);

    if (!rawPath) {
      return NextResponse.json(
        { error: 'RAW file not found' },
        { status: 404 }
      );
    }

    // Read the RAW file
    const rawBuffer = await fs.readFile(rawPath);

    // Determine the correct MIME type based on extension
    const ext = path.extname(rawPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.arw': 'image/x-sony-arw',
      '.nef': 'image/x-nikon-nef',
      '.cr2': 'image/x-canon-cr2',
      '.cr3': 'image/x-canon-cr3',
      '.dng': 'image/x-adobe-dng',
      '.raf': 'image/x-fuji-raf',
      '.orf': 'image/x-olympus-orf',
      '.rw2': 'image/x-panasonic-rw2',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Return the RAW file with appropriate headers
    return new NextResponse(rawBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${safeName}${ext}"`,
        'Content-Length': rawBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // RAW files never change
      },
    });
  } catch (error) {
    console.error('[RAW DOWNLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download RAW file' },
      { status: 500 }
    );
  }
}
