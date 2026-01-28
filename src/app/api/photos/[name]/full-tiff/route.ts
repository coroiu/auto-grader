import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/processing';
import { convertRawToTiff } from '@/lib/processing/raw';

export const dynamic = 'force-dynamic';

// Longer timeout for full-res conversion
export const maxDuration = 300;

/**
 * Recursively search for a file in a directory
 */
async function findFileRecursively(
  dir: string,
  filename: string
): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const found = await findFileRecursively(fullPath, filename);
        if (found) return found;
      } else if (entry.name === filename) {
        return fullPath;
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return null;
}

// Track in-progress generations to avoid duplicate work
const generatingFullTiffs = new Map<string, Promise<void>>();

/**
 * GET /api/photos/[name]/full-tiff
 * Generate and serve a full-resolution TIFF for client-side export.
 * The TIFF is generated on-demand and cached in the output directory.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Sanitize input
    const safeName = path.basename(name);
    const outputDir = path.join(config.outputDir, safeName);
    const fullTiffPath = path.join(outputDir, 'full.tif');

    // Check if full TIFF already exists
    try {
      await fs.access(fullTiffPath);
      // Exists, serve it
      const fileBuffer = await fs.readFile(fullTiffPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/tiff',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      // Need to generate
    }

    // Find the RAW file
    let rawPath: string | null = null;
    for (const ext of config.rawExtensions) {
      const filename = `${safeName}${ext}`;
      const directPath = path.join(config.inboxDir, filename);
      try {
        await fs.access(directPath);
        rawPath = directPath;
        break;
      } catch {
        const found = await findFileRecursively(config.inboxDir, filename);
        if (found) {
          rawPath = found;
          break;
        }
      }
    }

    if (!rawPath) {
      console.error(
        `[API] Full TIFF: RAW file not found for ${safeName}`
      );
      return NextResponse.json(
        { error: 'RAW file not found in inbox' },
        { status: 404 }
      );
    }

    // Deduplicate concurrent requests
    let generationPromise = generatingFullTiffs.get(safeName);
    if (!generationPromise) {
      generationPromise = (async () => {
        try {
          await fs.mkdir(outputDir, { recursive: true });
          console.log(`[API] Generating full-res TIFF for ${safeName}...`);
          await convertRawToTiff(rawPath!, fullTiffPath);
          console.log(`[API] Full-res TIFF generated for ${safeName}`);
        } finally {
          generatingFullTiffs.delete(safeName);
        }
      })();
      generatingFullTiffs.set(safeName, generationPromise);
    }

    await generationPromise;

    // Serve the generated TIFF
    const fileBuffer = await fs.readFile(fullTiffPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/tiff',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[API] Failed to generate/serve full TIFF:', error);
    return NextResponse.json(
      { error: 'Failed to generate full resolution TIFF' },
      { status: 500 }
    );
  }
}
