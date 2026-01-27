# Auto Grader Architecture

**Date**: 2026-01-27
**Status**: Accepted

## Context

Need to build a photography workflow automation tool that:
1. Watches for new RAW files uploaded via FTP
2. Converts RAW files to usable format
3. Applies LUTs to generate multiple graded outputs per photo
4. Provides a gallery UI to browse and compare results

The system should be simple to deploy and maintain, with minimal operational overhead.

## Decision

Use a single-container architecture with filesystem-based state management:

- **Single Docker container** with darktable-cli, FFmpeg, and Next.js
- **Filesystem-based state** - no database; state derived from file existence
- **p-queue** for in-memory job queue with filesystem crash recovery
- **Next.js** for unified frontend + API in one codebase

### Processing Pipeline

```
ARW → [darktable-cli] → TIFF → [FFmpeg + LUTs] → JPGs
```

### State Detection

State is derived from the filesystem:
- Photo **pending**: folder doesn't exist or `.processing` marker present
- Photo **complete**: folder exists with all expected JPGs
- Photo needs **partial processing**: folder exists but missing some LUT outputs

## Rationale

### Single Container
- Simpler deployment than multi-container orchestration
- Worker runs in same process, reducing complexity
- Suitable for single-user/small-team use case
- Can scale horizontally later if needed

### Filesystem-Based State
- No database migrations or schema management
- State is visible and debuggable via filesystem
- Adding new LUT = drop file, system detects missing outputs
- Delete outputs to trigger reprocessing
- Crash recovery: scan for `.processing` markers on startup

### p-queue vs External Queue
- No Redis/RabbitMQ infrastructure needed
- In-memory queue is sufficient for workload
- Crash recovery via filesystem scan at startup

### darktable-cli for RAW Processing
- Open source, actively maintained
- High-quality RAW processing
- CLI interface suitable for automation
- Supports Sony ARW format

### FFmpeg for LUT Application
- Industry standard tool
- `lut3d` filter supports .cube files natively
- Fast processing

## Alternatives Considered

### Database for State
- **PostgreSQL/SQLite**: Traditional choice
  - Pros: ACID guarantees, query flexibility
  - Cons: Migration overhead, additional dependency
- **Decision**: Filesystem state is simpler and sufficient for this use case

### Multiple Containers
- **Separate worker container**: Common pattern
  - Pros: Independent scaling, isolation
  - Cons: More complex deployment, inter-service communication
- **Decision**: Single container for simplicity, can split later if needed

### External Job Queue
- **Redis/BullMQ**: Production-grade queue
  - Pros: Persistence, visibility, scaling
  - Cons: Additional infrastructure
- **Decision**: p-queue is sufficient; filesystem provides persistence

### ImageMagick for RAW Processing
- **ImageMagick**: Alternative to darktable
  - Pros: Widely available
  - Cons: Lower quality RAW demosaicing, limited RAW format support
- **Decision**: darktable provides better quality

## Consequences

### Positive
- Simple deployment (single `docker-compose up`)
- No database management
- Easy debugging (inspect filesystem directly)
- New LUTs automatically trigger reprocessing of missing outputs
- Portable - no external service dependencies

### Negative
- In-memory queue state lost on crash (mitigated by filesystem scan)
- No built-in job visibility dashboard
- Single container limits horizontal scaling
- Filesystem operations not atomic (mitigated by `.processing` marker)

## References

- darktable-cli documentation: https://docs.darktable.org/usermanual/development/en/special-topics/program-invocation/darktable-cli/
- FFmpeg lut3d filter: https://ffmpeg.org/ffmpeg-filters.html#lut3d-1
- p-queue library: https://github.com/sindresorhus/p-queue

## Notes

Future considerations:
- If scaling is needed, worker could be extracted to separate container
- Could add Redis for job visibility without changing core architecture
- WebSocket could be added for real-time processing status updates
