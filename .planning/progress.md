# Project Progress

**Last Updated**: 2026-01-28

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
