# Project Roadmap

## Overview

Auto Grader is a photography workflow automation tool that watches for new RAW files, converts them using darktable-cli, applies LUTs to generate multiple graded JPGs per photo, and provides a gallery UI to browse and compare outputs.

## Phases

### Phase 1: Foundation
**Status**: Complete

**Goals**:
- Set up Next.js project with TypeScript and Tailwind
- Create Docker environment with all required tools
- Implement basic file watching and processing

**Key Deliverables**:
- [x] Working Next.js application
- [x] Dockerfile with darktable, FFmpeg, exiftool
- [x] docker-compose.yml with volume mounts
- [x] File watcher for `/data/inbox`
- [x] Filesystem state utilities
- [x] Basic ARW → JPG pipeline

### Phase 2: LUT Processing
**Status**: Complete

**Goals**:
- Implement full LUT processing pipeline
- Handle multiple LUTs per photo
- Extract and cache metadata

**Key Deliverables**:
- [x] LUT scanning from `/data/luts`
- [x] FFmpeg integration for LUT application
- [x] N+1 outputs per photo (N LUTs + original)
- [x] EXIF metadata extraction to metadata.json
- [x] Thumbnail generation
- [x] Error handling with `.processing` marker

### Phase 3: Gallery UI
**Status**: Complete

**Goals**:
- Build browsable gallery interface
- Implement photo comparison view
- Add processing status indicators

**Key Deliverables**:
- [x] API endpoints: GET /api/photos, GET /api/photos/[name], POST /api/rescan, GET /api/status, GET /api/health
- [x] Gallery grid component (grouped by capture date)
- [x] Photo detail page with side-by-side comparison
- [x] Processing status indicator
- [x] "Rescan" functionality for new LUTs

### Phase 4: CI/CD & Polish
**Status**: Complete

**Goals**:
- Automate builds and deployments
- Add documentation and health checks

**Key Deliverables**:
- [x] GitHub Actions workflow (lint, type-check, build)
- [x] Docker build and push to ghcr.io
- [x] README with setup instructions
- [x] Health check endpoint

## Milestones

- [x] Project structure and planning complete
- [x] Phase 1: Basic processing pipeline working
- [x] Phase 2: Full LUT processing with all outputs
- [x] Phase 3: Gallery UI functional
- [x] Phase 4: CI/CD pipeline active
- [x] End-to-end testing with 12 photos and 20 LUTs

## Future Improvements

These items are not blockers but would improve reliability and UX:

- [x] Serialize or batch LUT application to avoid FFmpeg race conditions
- [x] Add retry logic for failed LUT applications
- [x] Improve stale marker cleanup during runtime

## Architecture Diagram

```
[FTP Upload] → [/data/inbox] → [File Watcher] → [Processing Queue]
                                                        ↓
                               [darktable-cli: ARW → TIFF]
                                                        ↓
                               [FFmpeg: TIFF + LUTs → JPGs]
                                                        ↓
[Gallery UI] ← [Next.js API] ← [Filesystem] ← [/data/output]
```

## Output Structure

```
/data/output/
  DSC00123/                    # Folder named after RAW file
    .processing                # Marker: processing in progress
    metadata.json              # EXIF data (cached)
    thumb.jpg                  # Thumbnail for gallery
    original.jpg               # No LUT applied
    Cinematic-1.jpg            # Named after LUT (Cinematic-1.cube)
    Moody1.jpg                 # Named after LUT (Moody1.cube)
```

---

**Last Updated**: 2026-01-27
