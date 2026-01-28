# Gallery Performance Optimization

**Date**: 2026-01-28
**Status**: Accepted

## Context

The gallery page becomes slow with hundreds of photos due to:
1. **Server scans filesystem on every request** - `getPhotos()` calls `fs.readdir` + multiple `fs.access()` per photo
2. **All photos rendered at once** - No pagination, entire array passed to client
3. **All DOM nodes created** - Gallery renders every photo card even when off-screen
4. **`force-dynamic` prevents caching** - Fresh filesystem scan on every page load

With 500 photos, server response takes 3-5 seconds (filesystem scan), and the browser struggles to render ~2500 DOM nodes.

## Decision

Implement a three-phase optimization:

### Phase 1: Persistent In-Memory Photo Store
- Maintain an in-memory `Map<string, Photo>` of processed photos
- On startup, scan filesystem once to populate the store
- Watch the output directory with chokidar for changes
- Update store incrementally when photos are added/removed
- `getPhotos()` returns from memory instantly (no filesystem scan)

### Phase 2: Virtual Scroll Gallery
- Replace current Gallery with virtualized rendering using `@tanstack/react-virtual`
- Only render visible rows (~20-30) regardless of total photo count
- Flatten date-grouped photos into virtual rows (header rows + photo rows)
- Responsive column count: 2 (mobile) → 5 (large desktop)

### Phase 3: Image Optimizations
- Use `loading="lazy"` on images (virtualizer handles visibility)
- Remove `priority` flag since virtual scroll controls what's visible

## Rationale

This approach addresses all performance bottlenecks:
- **Memory store** eliminates O(n) filesystem operations on every page load
- **Virtual scroll** keeps DOM node count constant regardless of photo count
- **Watcher integration** means new photos appear automatically after processing

The solution fits the existing architecture (filesystem-based state, single container) and uses the already-installed chokidar library.

## Alternatives Considered

### Option 1: Pagination
- Pros: Simple to implement
- Cons: Poor UX (clicking through pages), doesn't solve server-side scanning

### Option 2: Database for state
- Pros: Fast queries, could add filtering/search
- Cons: Adds complexity, violates "filesystem-based state" architecture decision

### Option 3: Static generation with ISR
- Pros: Cached pages, fast loads
- Cons: Stale data between revalidations, complex cache invalidation

## Consequences

### Positive
- Server response drops from 3-5s to <10ms
- DOM node count stays constant (~30) vs scaling with photo count
- Smooth 60fps scrolling regardless of gallery size
- New photos appear automatically when processing completes

### Negative
- Increased memory usage (photo metadata kept in memory)
- Added complexity with store initialization and watcher coordination
- Client needs page refresh to see new photos (no real-time updates without SSE/polling)

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/processing/photoStore.ts` | Create | In-memory photo store + output watcher |
| `src/lib/processing/state.ts` | Modify | `getPhotos()` reads from store |
| `src/lib/processing/watcher.ts` | Modify | Initialize photo store on startup |
| `src/lib/processing/index.ts` | Modify | Export new functions |
| `src/app/page.tsx` | Modify | Remove force-dynamic |
| `src/components/Gallery.tsx` | Modify | Integrate VirtualGallery |
| `src/components/VirtualGallery.tsx` | Create | Virtual scroll implementation |

## References

- [@tanstack/react-virtual documentation](https://tanstack.com/virtual/latest)
- Related decision: [2026-01-27-auto-grader-architecture.md](2026-01-27-auto-grader-architecture.md)
