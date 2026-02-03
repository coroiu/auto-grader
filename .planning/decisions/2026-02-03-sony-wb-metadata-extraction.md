# Extract Absolute White Balance from Sony ARW Metadata

**Date**: 2026-02-03
**Status**: Accepted

## Context

The white balance editor in the WebGL image editor was using hardcoded defaults (6500K temperature, 0 tint) instead of the actual white balance settings from the camera. This meant users couldn't see the camera's white balance as their starting point, making it harder to judge adjustments and understand what the camera originally captured.

Sony ARW files contain white balance metadata in several EXIF tags:
- `ColorTemperature` - Direct Kelvin value (when camera uses custom WB)
- `WhiteBalance` - Mode name (Auto, Daylight, Cloudy, Tungsten, etc.)
- `WBShiftAB_GM` - Array `[amberBlue, greenMagenta]` for fine-tuning

## Decision

Extract white balance metadata from Sony ARW files during RAW processing and store in `metadata.json`, then use these values as defaults when initializing the WebGL editor.

**Tag Priority**:
1. `ColorTemperature` - Use direct Kelvin value if available and valid (2000-10000K)
2. `WhiteBalance` - Map mode name to standard Kelvin values if ColorTemperature unavailable
3. `WBShiftAB_GM` - Extract green-magenta shift, normalize from Sony's ±9 range to our ±1 range

**Fallback**: Default to 6500K/0 tint when WB metadata is unavailable or unparseable (backward compatibility with non-Sony cameras or old photos).

**Rescan Support**: When users click "Rescan", re-extract metadata from RAW files for existing photos that lack WB fields.

## Rationale

**Photographer-friendly defaults**: Showing the camera's actual WB settings provides a meaningful baseline. Photographers can see what the camera captured and make informed adjustments from there, rather than starting from an arbitrary 6500K.

**Reset behavior makes sense**: When users click "Reset", returning to the camera's WB settings (not a hardcoded value) matches photographers' mental model - "reset" means "back to what the camera did."

**Non-invasive implementation**: Using optional fields in the metadata interface ensures backward compatibility. Old photos without WB metadata gracefully fall back to 6500K/0 without errors.

**Low-effort rescan**: Users can update old photos' metadata by clicking "Rescan" without reprocessing all images.

## Alternatives Considered

### Option 1: Ignore camera WB, always start at 6500K
- **Pros**: Simpler implementation, no metadata extraction needed
- **Cons**: Loses valuable camera information, less intuitive for photographers

### Option 2: Extract WB but don't use as defaults
- **Pros**: Provides info without changing behavior
- **Cons**: Metadata is useless if not applied; adds complexity without benefit

### Option 3: Require full reprocessing for old photos
- **Pros**: Simpler rescan logic
- **Cons**: Forces users to regenerate all JPGs just to update metadata

## Consequences

### Positive
- Editor starts with camera's actual white balance settings
- Reset buttons return to meaningful camera defaults, not arbitrary values
- Backward compatible with existing photos (graceful fallback)
- Rescan allows updating old photos without reprocessing images

### Negative
- Adds complexity to metadata extraction (3 EXIF tags, mapping logic)
- WB mode mapping may need expansion for other Sony camera models
- Non-Sony RAW files fall back to 6500K (acceptable trade-off)

### Trade-offs
- Clamping out-of-range values (e.g., 1500K → 2000K) prevents errors but may lose extreme custom settings
- Mode mapping is approximate - "Cloudy" is mapped to 6500K but actual value may vary by scene

## Implementation Details

**Files Modified**: 6 files
- `state.ts`: Added `whiteBalanceKelvin`, `whiteBalanceTint`, `whiteBalanceMode` to `PhotoMetadata`
- `metadata.ts`: Added WB extraction logic with mode mapping function (~80 lines)
- `watcher.ts`: Added rescan metadata re-extraction (~60 lines)
- `ImageEditor.tsx`: Extract EXIF defaults, update state initialization and reset buttons (~30 lines)
- `EditPageClient.tsx`: Pass metadata prop to editor (~3 lines)
- `page.tsx`: Pass metadata to EditPageClient (~1 line)

**Sony WB Mode Mapping**:
| Mode | Kelvin |
|------|--------|
| Daylight | 5500K |
| Cloudy | 6500K |
| Shade | 7500K |
| Tungsten | 3200K |
| Fluorescent | 4000K |
| Flash | 5500K |
| Custom/Auto | Use ColorTemperature tag |

**Tint Extraction**: Sony's `WBShiftAB_GM[1]` uses ±9 range, normalized to our ±1 scale.

## References

- [Sony EXIF Tags - ExifTool](https://exiftool.org/TagNames/Sony.html)
- [White Balance Standards - Wikipedia](https://en.wikipedia.org/wiki/Color_temperature#Categorizing_different_lighting)
- Implementation plan: `.planning/decisions/2026-02-03-sony-wb-extraction-plan.md`
