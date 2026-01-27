# Project Progress

**Last Updated**: 2026-01-27

## Current Status

Implementation complete and tested. The system successfully processes RAW photos, applies LUTs, and serves them via a gallery UI. Some reliability improvements needed for production use.

## Completed

- [2026-01-21] Set up project structure with `.research/`, `.planning/`, `docs/`, and `src/` directories
- [2026-01-21] Created CLAUDE.md with comprehensive guidelines for Claude collaboration
- [2026-01-27] **Phase 1: Foundation** - Complete
  - Next.js 14 with TypeScript and Tailwind CSS
  - Dockerfile with darktable, FFmpeg, exiftool
  - docker-compose with volume mounts
  - File watcher (chokidar)
  - Filesystem state utilities
- [2026-01-27] **Phase 2: LUT Processing** - Complete
  - LUT scanning from `/data/luts`
  - FFmpeg lut3d filter integration
  - EXIF metadata extraction
  - Thumbnail generation
- [2026-01-27] **Phase 3: Gallery UI** - Complete
  - API endpoints: /api/photos, /api/photos/[name], /api/status, /api/rescan, /api/health
  - Gallery grid with date grouping
  - Photo comparison view
  - Status bar with rescan
- [2026-01-27] **Phase 4: CI/CD** - Complete
  - GitHub Actions workflow
- [2026-01-27] **Testing** - Complete
  - Tested with 12 RAW photos and 20 LUTs
  - Verified concurrent processing
  - Fixed darktable database lock issue

## Known Issues

1. **LUT Race Condition**: Applying 20 LUTs in parallel causes some FFmpeg failures (exit code null) due to concurrent access to the same TIFF file. Most LUTs succeed, some fail.

2. **Stale Processing Markers**: Photos that crash mid-processing leave `.processing` markers. The rescan API handles this, but automatic cleanup could be improved.

## Recommended Improvements

1. **Serialize LUT application** or use batches (e.g., 4 at a time) instead of all 20 in parallel
2. **Add retry logic** for failed LUT applications
3. **Copy TIFF per LUT** to avoid concurrent read issues
4. **Add progress WebSocket** for real-time UI updates

## Test Results

With 12 RAW photos and 20 LUTs:
- All 12 photos detected and queued
- RAW → TIFF conversion: Working (with darktable isolation fix)
- LUT application: 70-100% success rate per photo (race condition)
- Gallery UI: Working, shows completed photos
- API: All endpoints functional

## Next Steps

For production readiness:
1. Fix LUT concurrency (batch or serialize)
2. Add WebSocket for progress updates
3. Add retry logic for failed LUTs
4. Consider reducing default CONCURRENCY to 1

## Architecture

See `.planning/decisions/2026-01-27-auto-grader-architecture.md` for full details.
