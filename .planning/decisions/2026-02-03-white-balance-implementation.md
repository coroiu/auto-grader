# White Balance Implementation

**Date**: 2026-02-03
**Status**: Accepted

## Context

The WebGL-based image editor needed white balance controls to allow photographers to correct color temperature and tint issues in their images. White balance is a fundamental adjustment in photography, typically performed before exposure and creative grading.

Users need to:
- Correct color casts from different lighting conditions (tungsten, daylight, shade, etc.)
- Fine-tune color balance with green/magenta tint adjustments
- Preview adjustments in real-time
- Export images with WB adjustments applied

## Decision

Implement **Kelvin-based temperature** (2000K-10000K) + **tint** (-1 to +1, green to magenta) white balance controls in the browser-based WebGL image editor.

### Technical Approach

**Algorithm**: Tanner Helland's Kelvin-to-RGB approximation algorithm
- Converts color temperature (Kelvin) to RGB multiplier using piecewise polynomial functions
- Accurate for 1000K-40000K range; we use 2000K-10000K (practical photography range)
- GPU-friendly: pure mathematical functions, no lookup tables needed
- Brightness normalization: divide by 6500K reference to preserve perceived brightness

**Processing Pipeline**: WB → Exposure → Clamp → LUT
- White balance applied first in sRGB space (before exposure adjustment)
- Exposure adjustment applied after WB (filmic tone mapping)
- Clamp to [0,1] before LUT application
- LUT receives color-shifted input (expected behavior for creative grading)

**Implementation Details**:
- **Temperature**: 2000K (warm/candlelight) to 10000K (cool/shade), default 6500K (daylight)
- **Tint**: -1.0 (green) to +1.0 (magenta), default 0 (neutral)
- **UI**: Sliders with Kelvin/value display and reset buttons
- **Persistence**: localStorage per-photo editing sessions
- **Export**: Client-side canvas export includes WB adjustments (no server-side changes)

## Rationale

### Why Kelvin-Based Temperature?

1. **Industry Standard**: Matches Lightroom, Capture One, and all professional photography tools
2. **Photographer-Friendly**: Intuitive interface that photographers already understand
3. **Physically Accurate**: Based on blackbody radiation color temperature curve
4. **Predictable Behavior**: Linear scale with expected warm/cool shifts

### Why Tanner Helland's Algorithm?

1. **Accuracy**: Close approximation to CIE blackbody curves
2. **Performance**: Pure math functions, no texture lookups
3. **GPU-Friendly**: Easily implemented in GLSL shader
4. **Well-Documented**: Proven algorithm with clear reference implementation
5. **Range Coverage**: Handles our 2000K-10000K range accurately

### Why Browser-Side Only?

1. **Non-Destructive**: Adjustments applied to preview only, RAW files untouched
2. **Real-Time Preview**: WebGL enables instant feedback as sliders move
3. **Client-Side Export**: Canvas export automatically includes all adjustments
4. **Simplicity**: No server-side FFmpeg changes or RAW reprocessing needed
5. **User Control**: Users can experiment without affecting source files

### Why This Pipeline Order (WB → Exposure → LUT)?

1. **Professional Workflow**: Matches standard photo editing sequence
   - First: Color correction (WB)
   - Second: Exposure/tone adjustment
   - Third: Creative grading (LUT)
2. **LUT Input**: LUTs designed to receive color-corrected input
3. **Expected Behavior**: Exposure adjustment should affect WB-corrected colors
4. **Reversibility**: Each stage builds on the previous, maintaining predictability

## Alternatives Considered

### Alternative 1: Simple RGB Multipliers
**Description**: Direct RGB channel multipliers (like "add warmth" filters)

**Pros**:
- Simplest to implement
- Fast GPU execution

**Cons**:
- Not physically accurate
- Doesn't match photographer expectations
- Hard to predict color shift results
- Not industry standard

**Why Rejected**: Doesn't provide the intuitive, physically-based control that photographers expect.

### Alternative 2: Lookup Table (LUT) Approach
**Description**: Pre-compute Kelvin values into a 1D texture for lookup

**Pros**:
- Slightly faster GPU execution (texture lookup vs math)
- Could support arbitrary temperature curves

**Cons**:
- Additional texture memory usage
- Complexity of LUT generation
- Interpolation between LUT entries
- Not significantly faster than math functions

**Why Rejected**: Marginal performance gain not worth the complexity. Tanner Helland's algorithm is already very efficient on GPU.

### Alternative 3: Server-Side RAW Reprocessing
**Description**: Apply WB adjustments during RAW conversion with darktable

**Pros**:
- Highest possible quality (working with RAW data)
- Could preserve full dynamic range

**Cons**:
- Slow: requires reprocessing entire RAW file
- Server load: CPU-intensive darktable operations
- Not real-time: users wait for processing
- Destructive: would need to store multiple versions
- Complex: state management for multiple processed versions

**Why Rejected**: Poor user experience. Real-time browser-based adjustment is far more interactive and doesn't require server resources.

### Alternative 4: Split Toning (Separate Highlights/Shadows WB)
**Description**: Different WB adjustments for highlights and shadows

**Pros**:
- More creative control
- Can fix mixed lighting scenarios

**Cons**:
- Much more complex UI (4+ sliders)
- Harder to understand for basic corrections
- Rarely needed for most photos

**Why Rejected**: Too complex for initial implementation. Can be added later as advanced feature.

## Consequences

### Positive

1. **Intuitive Interface**: Kelvin scale matches photographer expectations
2. **Real-Time Preview**: WebGL enables instant feedback
3. **Professional Quality**: Physically-based algorithm produces accurate colors
4. **No Server Load**: All processing happens client-side
5. **Non-Destructive**: RAW files remain untouched
6. **Persistence**: Settings saved per-photo for later refinement
7. **Export Integration**: Adjustments automatically included in canvas export

### Negative

1. **Brightness Normalization**: Very extreme temperatures (2000K, 10000K) may cause slight brightness shifts despite normalization
2. **sRGB Gamut Limits**: Extreme WB adjustments can push colors out of sRGB gamut, requiring clipping
3. **Color Clipping**: Very warm/cool adjustments on bright subjects may clip individual RGB channels
4. **No RAW Processing**: Working in sRGB space after RAW conversion, not with full RAW dynamic range
5. **Browser-Only**: WB adjustments only available in browser editor, not in batch processing pipeline

### Mitigations

- **Brightness preservation**: Normalize against 6500K reference to minimize brightness shifts
- **Clipping prevention**: Clamp operations after WB+exposure to keep colors displayable
- **Expected behavior**: Color clipping at extreme values is normal for creative grading tools
- **User guidance**: Slider labels indicate practical ranges (2000K=candle, 6500K=daylight, 10000K=shade)

## Implementation Notes

### Files Modified

1. **src/lib/webgl/ImageGrader.ts** (~120 new lines, ~10 modified)
   - Added `uTemperature` and `uTint` uniforms
   - Implemented `kelvinToRGB()` conversion function
   - Implemented `applyWhiteBalance()` shader function
   - Added public API: `setTemperature()`, `getTint()`, getters
   - Updated `render()` to pass WB uniforms

2. **src/components/ImageEditor.tsx** (~130 new lines, ~20 modified)
   - Updated `EditingSession` interface with temperature/tint
   - Added temperature/tint state and handlers
   - Added temperature slider (2000K-10000K) with Kelvin display
   - Added tint slider (-1 to +1) with +/- formatting
   - Updated localStorage persistence
   - Updated export handler to include WB settings

3. **src/app/photos/[name]/edit/EditPageClient.tsx** (~5 modified lines)
   - Updated export handler signature
   - Apply WB settings before canvas export

### Total Changes
- **3 files modified**
- **~250 new lines of code**
- **~35 modified lines**

### Testing Performed

1. **Type Check**: `npm run type-check` - Passed
2. **Linting**: `npm run lint` - Passed
3. **Docker Build**: `docker-compose up --build -d` - Success
4. **Container Health**: Container running and healthy

### Future Enhancements (Out of Scope)

- White balance presets (Daylight, Tungsten, Shade, Fluorescent, etc.)
- Eyedropper tool to auto-calculate WB from neutral gray selection
- Before/After toggle for WB (similar to LUT toggle)
- Histogram display showing RGB channel distribution
- Preserve luminance option
- Split toning (separate WB for highlights/shadows)
- Logarithmic temperature slider for better control in common range

## References

**Kelvin-to-RGB Algorithms**:
- [Tanner Helland - Convert Temperature (K) to RGB](https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html) - **PRIMARY SOURCE**
- [Color Temperature Calculator](https://academo.org/demos/colour-temperature-relationship/)
- [color-temperature npm package](https://www.npmjs.com/package/color-temperature)

**WebGL Color Correction**:
- [Unity Shader Graph White Balance](https://docs.unity3d.com/Packages/com.unity.shadergraph@6.9/manual/White-Balance-Node.html)
- [Colour correction with WebGL - Tim Severien](https://tsev.dev/posts/2020-06-19-colour-correction-with-webgl/)

**Photography White Balance**:
- [White Balance in Photography - LightX](https://www.lightxeditor.com/photo-editing/adjust-image-white-balance-tint-temperature/)
- [Mastering White Balance - Capture Landscapes](https://www.capturelandscapes.com/master-white-balance-like-pro/)

**Related Decisions**:
- [2026-01-28-browser-based-image-editing.md](2026-01-28-browser-based-image-editing.md) - Initial WebGL editor implementation
- [2026-01-29-filmic-exposure-tone-mapping.md](2026-01-29-filmic-exposure-tone-mapping.md) - Exposure adjustment implementation
