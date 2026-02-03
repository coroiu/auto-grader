# Project Progress

**Last Updated**: 2026-02-03

## Current Status

Phases 1-6 complete. Core functionality, UX improvements, and gallery performance optimization are all implemented.

## Completed

- [2026-01-21] Set up project structure with `.research/`, `.planning/`, `docs/`, and `src/` directories
- [2026-01-21] Created CLAUDE.md with comprehensive guidelines
- [2026-01-27] **Phase 1: Foundation**
  - Next.js 14 with TypeScript and Tailwind CSS
  - Dockerfile with darktable, FFmpeg, exiftool
  - docker-compose with volume mounts
  - chokidar file watcher
  - Filesystem-based state management
  - p-queue job queue with configurable concurrency
- [2026-01-27] **Phase 2: LUT Processing**
  - LUT scanning from `/data/luts`
  - FFmpeg lut3d filter integration
  - N+1 outputs per photo (N LUTs + original)
  - EXIF metadata extraction with exiftool
  - Thumbnail generation
  - Processing marker for crash recovery
- [2026-01-27] **Phase 3: Gallery UI**
  - API: /api/photos, /api/photos/[name], /api/photos/[name]/[file]
  - API: /api/status, /api/rescan, /api/health
  - Gallery grid grouped by capture date
  - Photo comparison view with variant selection
  - Download links for all variants
  - Status bar with queue info and rescan button
- [2026-01-27] **Phase 4: CI/CD**
  - GitHub Actions: lint, type-check, build
  - Docker build and push to ghcr.io on main branch
- [2026-01-27] **Testing**
  - Tested with 12 Sony ARW files and 20 .cube LUTs
  - Fixed darktable concurrent processing (DARKTABLE_CONFIGDIR isolation)
  - Verified file watching, queueing, and processing
  - Verified gallery UI and all API endpoints
- [2026-01-27] **Phase 5: Mobile & Desktop UX**
  - Mobile: Embla carousel for swiping through selected variants
  - Mobile: All variants selected by default
  - Desktop: Single-click replaces selection
  - Desktop: Shift+click for multi-select (add/remove)
  - Dot indicators for carousel navigation on mobile
  - SSR-safe useMediaQuery hook for responsive detection
- [2026-01-28] **Phase 6: Gallery Performance Optimization**
  - In-memory photo store with chokidar output watcher
  - Virtual scroll gallery using @tanstack/react-virtual
  - Server response: 3-5s → <10ms (memory read vs filesystem scan)
  - DOM nodes: ~2500 → ~30 (constant regardless of photo count)
  - Automatic photo updates when processing completes
  - See `.planning/decisions/2026-01-28-gallery-performance-optimization.md`
- [2026-01-28] **Variant Selection Persistence**
  - localStorage persistence for variant selections (global across all photos)
  - Selections remembered across page refreshes and sessions
  - Graceful fallback to defaults if localStorage unavailable
  - Handles variant list changes (filters to valid variants only)
- [2026-01-28] **Window-Based Virtual Scroll**
  - Converted from `useVirtualizer` to `useWindowVirtualizer`
  - Header now scrolls away naturally with page content
  - Better mobile UX with more screen real estate for photos
  - Added `scrollMargin` tracking for correct item positioning
- [2026-01-28] **Browser-Based Image Editor**
  - WebGL2 real-time exposure adjustment and LUT preview
  - On-demand preview TIFF generation (2048px)
  - image-js/tiff for 16-bit TIFF decoding
  - 3D texture LUT application with trilinear interpolation
  - localStorage session persistence per-photo
  - Full-resolution export with applied settings
  - See `.planning/decisions/2026-01-28-browser-based-image-editing.md`

## Test Results

| Metric | Result |
|--------|--------|
| Photos tested | 12 |
| LUTs tested | 20 |
| RAW conversion | Working |
| LUT application | 70-100% per photo |
| Gallery UI | Working |
| API endpoints | All functional |

## Known Issues

All major known issues have been addressed:

1. ~~**LUT Race Condition**~~: Fixed by serializing LUT application (sequential processing instead of parallel)

2. ~~**Stale Markers**~~: Fixed with periodic cleanup during runtime (every 5 minutes, configurable)

## Recent Improvements (2026-01-27)

- **Serialized LUT Application**: Changed from parallel `Promise.all` to sequential processing to avoid FFmpeg race conditions
- **Retry Logic**: Added exponential backoff retry (3 attempts by default, configurable via `LUT_RETRIES` and `LUT_RETRY_DELAY_MS`)
- **Periodic Stale Marker Cleanup**: Added interval-based cleanup during runtime (configurable via `STALE_MARKER_CLEANUP_INTERVAL_MS`)

## In Progress

None currently.

## Latest Changes

- [2026-02-03] **Sony White Balance Metadata Extraction**
  - Extract white balance from Sony ARW files (ColorTemperature, WhiteBalance mode, WBShiftAB_GM)
  - Use camera's actual WB settings as editor defaults instead of hardcoded 6500K/0 tint
  - Map Sony WB mode names (Daylight, Cloudy, Tungsten, etc.) to Kelvin values
  - Reset buttons return to camera's EXIF values, not arbitrary defaults
  - Rescan functionality re-extracts metadata for existing photos
  - Backward compatible with photos lacking WB metadata (graceful 6500K/0 fallback)
  - See `.planning/decisions/2026-02-03-sony-wb-metadata-extraction.md`
  - Modified files:
    - `src/lib/processing/metadata.ts` - WB extraction logic with mode mapping
    - `src/lib/processing/state.ts` - Added WB fields to PhotoMetadata interface
    - `src/lib/processing/watcher.ts` - Rescan metadata re-extraction
    - `src/components/ImageEditor.tsx` - EXIF WB defaults for sliders and reset
    - `src/app/photos/[name]/edit/EditPageClient.tsx` - Pass metadata to editor
    - `src/app/photos/[name]/edit/page.tsx` - Pass metadata from API

- [2026-02-03] **White Balance Implementation**
  - Added Kelvin-based temperature control (2000K-10000K) to WebGL editor
  - Added tint control (-1 to +1, green to magenta) for fine-tuning
  - Implemented Tanner Helland's Kelvin-to-RGB algorithm in shader
  - White balance applied before exposure in processing pipeline (WB → Exposure → LUT)
  - Temperature and tint settings persist in localStorage per-photo
  - Included in full-resolution canvas exports
  - Modified files:
    - `src/lib/webgl/ImageGrader.ts` - Kelvin-to-RGB shader functions, uniforms, API methods
    - `src/components/ImageEditor.tsx` - Temperature/tint sliders and state management
    - `src/app/photos/[name]/edit/EditPageClient.tsx` - Export with WB settings

## Recently Completed

- [2026-01-29] **Filmic Exposure Tone Mapping**
  - Replaced simple linear exposure with professional filmic tone mapping
  - Luminance-based highlight roll-off with soft shoulder curve
  - Shadow protection (toe curve) for negative exposure adjustments
  - FFmpeg export updated with 17-point curves filter approximation
  - See `.planning/decisions/2026-01-29-filmic-exposure-tone-mapping.md`
  - Modified files:
    - `src/lib/webgl/ImageGrader.ts` - WebGL shader with filmic curve
    - `src/app/api/photos/[name]/export/route.ts` - FFmpeg curves filter

- [2026-01-28] **Browser-Based Image Editor** (WebGL exposure + LUT editing)
  - See `.planning/decisions/2026-01-28-browser-based-image-editing.md`
  - See `.research/findings/2026-01-28-webgl-image-processing.md`
  - Phase 0: Documentation - Complete
  - Phase 1: Backend APIs (preview TIFF, LUT endpoints) - Complete
  - Phase 2: WebGL core (ImageGrader, cube parser) - Complete
  - Phase 3: React editor component - Complete
  - Phase 4: localStorage persistence - Complete
  - Phase 5: Full-resolution export - Complete

## Future Improvements

See `.planning/roadmap.md` for full list. Key items:
- Add WebSocket for real-time progress

## Quick Start

```bash
# With Docker
mkdir -p data/{inbox,output,luts}
cp your-luts/*.cube data/luts/
docker compose up -d
# Drop .ARW files in data/inbox/
# Open http://localhost:3000

# Local development
npm install
npm run dev
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/processing/pipeline.ts` | RAW → TIFF → JPG orchestration |
| `src/lib/processing/watcher.ts` | File watcher with crash recovery |
| `src/lib/processing/state.ts` | Filesystem state management |
| `src/lib/processing/photoStore.ts` | In-memory photo store + output watcher |
| `src/lib/processing/photoStoreData.ts` | Photo store data (no chokidar dep) |
| `src/lib/processing/lut.ts` | FFmpeg LUT application |
| `src/app/photos/[name]/page.tsx` | Photo comparison UI |
| `src/app/photos/[name]/PhotoComparison.tsx` | Carousel/grid comparison view |
| `src/components/VirtualGallery.tsx` | Virtual scroll gallery |
| `src/hooks/useMediaQuery.ts` | SSR-safe responsive detection |
| `docker/Dockerfile` | Container with all tools |
| `.github/workflows/ci.yml` | CI/CD pipeline |
