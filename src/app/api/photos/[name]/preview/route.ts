import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/processing';
import { createPreviewTiff } from '@/lib/processing/raw';

export const dynamic = 'force-dynamic';

// Track in-progress preview generations to avoid duplicate work
const generatingPreviews = new Map<string, Promise<void>>();

/**
 * GET /api/photos/[name]/preview
 * Generate and serve a preview TIFF for browser-based editing.
 * The preview is generated on-demand and cached in the output directory.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Sanitize input to prevent directory traversal
    const safeName = path.basename(name);
    const outputDir = path.join(config.outputDir, safeName);
    const previewPath = path.join(outputDir, config.previewFile);

    // Check if preview already exists
    try {
      await fs.access(previewPath);
      // Preview exists, serve it
      const fileBuffer = await fs.readFile(previewPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/tiff',
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        },
      });
    } catch {
      // Preview doesn't exist, need to generate it
    }

    // Find the RAW file
    let rawPath: string | null = null;
    for (const ext of config.rawExtensions) {
      const candidatePath = path.join(config.inboxDir, `${safeName}${ext}`);
      try {
        await fs.access(candidatePath);
        rawPath = candidatePath;
        break;
      } catch {
        // Try next extension
      }
    }

    if (!rawPath) {
      return NextResponse.json(
        { error: 'RAW file not found' },
        { status: 404 }
      );
    }

    // Check if generation is already in progress (deduplication)
    let generationPromise = generatingPreviews.get(safeName);
    if (!generationPromise) {
      // Start generation
      generationPromise = (async () => {
        try {
          // Ensure output directory exists
          await fs.mkdir(outputDir, { recursive: true });
          await createPreviewTiff(rawPath!, previewPath);
        } finally {
          generatingPreviews.delete(safeName);
        }
      })();
      generatingPreviews.set(safeName, generationPromise);
    }

    // Wait for generation to complete
    await generationPromise;

    // Serve the newly generated preview
    const fileBuffer = await fs.readFile(previewPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/tiff',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[API] Failed to generate/serve preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
