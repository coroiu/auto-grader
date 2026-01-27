# Project Roadmap

## Overview

Auto Grader is a photography workflow automation tool that watches for new RAW files, converts them using darktable-cli, applies LUTs to generate multiple graded JPGs per photo, and provides a gallery UI to browse and compare outputs.

## Phases

### Phase 1: Foundation
**Status**: In Progress

**Goals**:
- Set up Next.js project with TypeScript and Tailwind
- Create Docker environment with all required tools
- Implement basic file watching and processing

**Key Deliverables**:
- Working Next.js application
- Dockerfile with darktable, FFmpeg, exiftool
- docker-compose.yml with volume mounts
- File watcher for `/data/inbox`
- Filesystem state utilities
- Basic ARW → JPG pipeline (without LUTs)

### Phase 2: LUT Processing
**Status**: Not Started

**Goals**:
- Implement full LUT processing pipeline
- Handle multiple LUTs per photo
- Extract and cache metadata

**Key Deliverables**:
- LUT scanning from `/data/luts`
- FFmpeg integration for LUT application
- N+1 outputs per photo (N LUTs + original)
- EXIF metadata extraction to metadata.json
- Thumbnail generation
- Error handling with `.processing` marker cleanup

### Phase 3: Gallery UI
**Status**: Not Started

**Goals**:
- Build browsable gallery interface
- Implement photo comparison view
- Add processing status indicators

**Key Deliverables**:
- API endpoints: GET /api/photos, GET /api/photos/[name]
- Gallery grid component (grouped by capture date)
- Photo detail page with side-by-side comparison
- Processing status indicator
- "Rescan" functionality for new LUTs

### Phase 4: CI/CD & Polish
**Status**: Not Started

**Goals**:
- Automate builds and deployments
- Add documentation and health checks
- Polish user experience

**Key Deliverables**:
- GitHub Actions workflow (lint, type-check, test)
- Docker build and push to ghcr.io
- README with setup instructions
- Health check endpoint
- Error handling improvements

## Milestones

- [x] Project structure and planning complete
- [ ] Phase 1: Basic processing pipeline working
- [ ] Phase 2: Full LUT processing with all outputs
- [ ] Phase 3: Gallery UI functional
- [ ] Phase 4: CI/CD pipeline active

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
    cinematic.jpg              # Named after LUT (cinematic.cube)
    vintage.jpg                # Named after LUT (vintage.cube)
```

---

**Note**: This roadmap is a living document. Update it as the project evolves.
