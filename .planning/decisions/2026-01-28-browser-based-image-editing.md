# Browser-Based Image Editing with WebGL

**Date**: 2026-01-28
**Status**: Accepted

## Context

Some photos arrive with suboptimal exposure. Since we're working with RAW files, there's room to correct this, but the question is how. The current pipeline uses darktable's "as shot" processing with no exposure adjustments.

Options considered:
1. **Automatic exposure correction** - Rigid, no guarantee it's better than camera metering
2. **XMP sidecar support** - Requires user to have darktable locally, extra manual step
3. **Server-side re-processing** - Adds latency, requires round-trip for every adjustment
4. **Browser-based editing** - Real-time feedback, no server load for previews

The goal is to let users interactively adjust exposure and preview LUTs before committing to a final output.

## Decision

Implement in-browser image editing using WebGL2 for real-time exposure adjustment and LUT application.

**Key architectural choices:**

1. **On-demand preview TIFF generation**: Generate 2048px preview TIFF when user first visits edit page, cache in output directory
2. **WebGL2 rendering**: Use raw WebGL2 (not Three.js) with single-pass shader for exposure + LUT
3. **Re-generate from RAW on export**: Don't store full-res TIFF; regenerate when user commits final settings
4. **localStorage persistence**: Save editing session per-photo so users can resume after closing browser

**Data flow:**
```
User visits /photos/[name]/edit
  → API checks for preview.tif, generates if missing (from RAW via darktable)
  → Browser downloads preview TIFF (~2-4MB) + LUT files (.cube)
  → WebGL renders exposure + LUT adjustments in real-time
  → User clicks "Export" → Server regenerates full-res from RAW with settings
```

## Rationale

### Why browser-based (not server-side re-processing)?

- **Real-time feedback**: Slider changes reflected instantly (<16ms render time)
- **No server load**: All preview work happens on client GPU
- **Better UX**: Users see results immediately, can experiment freely

### Why WebGL2 (not Three.js)?

- **Minimal overhead**: Three.js adds ~500KB parsed JavaScript for features we don't need
- **Native 3D textures**: WebGL2 has `texImage3D()` for LUT sampling without atlas hacks
- **Simple use case**: Fullscreen quad + fragment shader doesn't need scene graph

### Why image-js/tiff (not UTIF.js)?

| Library | 16-bit Support | Output |
|---------|----------------|--------|
| UTIF.js | Parses, but `toRGBA8()` converts to 8-bit | Uint8Array |
| image-js/tiff | Native 16-bit preservation | Uint16Array |

For exposure editing, preserving the full 16-bit dynamic range is critical.

### Why on-demand preview (not pre-generated)?

- Saves disk space (not all photos need editing)
- Preview only generated when user actually visits edit page
- Cached after first generation

### Why re-generate from RAW on export (not keep full-res TIFF)?

- Saves 35-75MB per photo (sensor size dependent)
- Export is infrequent (user only exports after finding desired settings)
- darktable conversion takes seconds, acceptable for final export

## Alternatives Considered

### 1. Automatic exposure during RAW conversion

- **Pros**: No UI changes needed, automated
- **Cons**: "Automatic" doesn't guarantee better results; removes creative control

### 2. XMP sidecar support

- **Pros**: Full darktable editing power, familiar workflow
- **Cons**: Requires darktable installed locally, extra manual step before upload

### 3. Server-side re-processing via API

- **Pros**: Simpler frontend, no WebGL needed
- **Cons**: Network latency on every slider change, server CPU load

### 4. Pre-generate exposure variants (like LUTs)

- **Pros**: Simple implementation
- **Cons**: Multiplies storage (5x for -2, -1, 0, +1, +2 EV), still might not hit right exposure

## Consequences

### Positive

- Real-time editing experience with instant feedback
- No server load for preview adjustments
- Users can experiment freely without waiting
- Editing sessions persist across browser closes
- Keeps existing quick-comparison workflow intact (parallel approach)

### Negative

- More complex frontend code (WebGL shaders)
- ~2-4MB download for preview TIFF on edit page
- WebGL2 required (Safari 15.4+, all modern Chrome/Firefox/Edge)
- Export still requires server processing (acceptable trade-off)

## Implementation

### New API endpoints

- `GET /api/photos/[name]/preview` - Generate/serve preview TIFF
- `GET /api/luts` - List available LUTs with URLs
- `GET /api/luts/[name]` - Serve .cube files
- `POST /api/photos/[name]/export` - Full-res export with settings

### New frontend components

- `/src/lib/webgl/ImageGrader.ts` - WebGL2 renderer class
- `/src/lib/webgl/cubeLutParser.ts` - .cube file parser
- `/src/components/ImageEditor.tsx` - React component
- `/src/app/photos/[name]/edit/page.tsx` - Edit page route

### localStorage schema

```typescript
interface EditingSession {
  exposure: number;      // EV adjustment (-3 to +3)
  selectedLut: string;   // LUT name or null
  lutEnabled: boolean;   // For A/B toggle
  lastModified: string;  // ISO timestamp
}
// Key: "auto-grader:edit:{photoName}"
```

## References

- Related research: [2026-01-28-webgl-image-processing.md](../research/findings/2026-01-28-webgl-image-processing.md)
- WebGL 3D LUT example: https://threejs.org/examples/webgl_postprocessing_3dlut.html
- image-js/tiff: https://github.com/image-js/tiff
