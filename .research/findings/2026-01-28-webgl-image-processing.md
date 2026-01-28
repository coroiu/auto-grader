# WebGL Image Processing for Photography Editing

**Date**: 2026-01-28
**Researcher**: Claude + User
**Status**: Complete

## Question/Goal

Can we perform real-time exposure adjustment and 3D LUT application in the browser using WebGL? What are the technical requirements and best approaches?

## Key Findings

### Finding 1: Browser TIFF Decoding is Well-Supported

Two main JavaScript libraries handle TIFF decoding:

| Library | 16-bit Support | Weekly Downloads | Best For |
|---------|----------------|------------------|----------|
| **UTIF.js** | Parses 16-bit, but `toRGBA8()` converts to 8-bit | ~737K | General use, display |
| **image-js/tiff** | Native Uint16Array preservation | ~52K | HDR/scientific, WebGL |

**UTIF.js** (photopea/UTIF.js):
- Powers Photopea image editor
- Supports many compression formats (LZW, JPEG, PackBits, Fax)
- `toRGBA8()` convenience method loses 16-bit precision

**image-js/tiff**:
- Returns data as typed arrays matching source bit depth
- `Uint16Array` for 16-bit images, `Float32Array` for 32-bit
- Better for WebGL where we want `Float32Array` for GPU upload

**Recommendation**: Use image-js/tiff for photography editing to preserve full dynamic range.

### Finding 2: WebGL2 Has Native 3D Texture Support

3D LUTs (.cube format) map RGB input colors to new RGB output colors. WebGL2 provides native 3D texture support:

```javascript
// WebGL2 3D texture upload
gl.texImage3D(
  gl.TEXTURE_3D, 0, gl.RGBA32F,
  lutSize, lutSize, lutSize, 0,
  gl.RGBA, gl.FLOAT, lutData
);
```

For LUT sampling, use `LINEAR` filtering for smooth color interpolation:
```javascript
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

**WebGL1 fallback** (if needed): Emulate 3D texture with 2D atlas, performing two reads and blending. However, WebGL2 is supported in all modern browsers (Safari 15.4+, 2022).

### Finding 3: .cube File Format is Simple Text

Adobe/Iridas .cube format structure:
```
# Comment
TITLE "LUT Name"
LUT_3D_SIZE 33
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
0.0 0.0 0.0
0.031 0.0 0.0
... (33^3 = 35,937 RGB triplets for 33-size LUT)
```

Key parsing notes:
- Skip lines starting with `#` (comments)
- Parse `LUT_3D_SIZE` to get dimension (typically 17, 33, or 65)
- Data lines are space-separated R G B float values
- Order: R varies fastest, then G, then B (same as OpenGL 3D texture layout)

### Finding 4: Combined Exposure + LUT Shader is Efficient

Single-pass fragment shader approach:

```glsl
#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler2D uImage;
uniform sampler3D uLUT;
uniform float uExposure;  // In stops (EV)
uniform float uLUTSize;

void main() {
  vec3 color = texture(uImage, vTexCoord).rgb;

  // Exposure: multiply by 2^stops (photographic formula)
  color *= pow(2.0, uExposure);
  color = clamp(color, 0.0, 1.0);

  // LUT: sample with texel center offset
  float scale = (uLUTSize - 1.0) / uLUTSize;
  float offset = 0.5 / uLUTSize;
  color = texture(uLUT, color * scale + offset).rgb;

  // Linear to sRGB gamma
  color = mix(
    color * 12.92,
    1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, color)
  );

  fragColor = vec4(color, 1.0);
}
```

**Performance**: Single draw call, all operations in one shader pass. Expected <16ms for 2048px images on any modern GPU.

### Finding 5: Memory/Performance Characteristics

For a 2048x1365 preview image (3:2 aspect ratio):

| Resource | Memory |
|----------|--------|
| Source TIFF download | ~2-4MB (compressed) |
| GPU texture (RGBA32F) | ~45MB |
| 3D LUT (33^3, RGBA32F) | ~560KB |
| **Total VRAM** | ~46MB |

This is well within capability of any modern GPU, including mobile devices.

**Real-time update**: Uniform changes (exposure slider) don't require texture re-upload. Only `gl.uniform1f()` call + `gl.drawArrays()` - sub-millisecond.

### Finding 6: Three.js vs Raw WebGL2

| Approach | Pros | Cons |
|----------|------|------|
| **Three.js** | Familiar API, existing LUT examples | 500KB+ bundle, overkill for 2D |
| **Raw WebGL2** | Minimal overhead, direct control | More boilerplate code |

For a focused 2D image processing task (one fullscreen quad, one shader), raw WebGL2 is preferred. Three.js's scene graph, cameras, and materials aren't needed.

### Finding 7: Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGL2 | 56+ (2017) | 51+ (2017) | 15.4+ (2022) | 79+ (2020) |
| RGBA32F textures | Yes | Yes | Yes | Yes |
| 3D textures | Yes | Yes | Yes | Yes |

Safari 15.4 (March 2022) was the last major browser to add WebGL2. For older Safari, could fall back to showing pre-rendered JPGs only.

## Implications for Our Project

1. **Browser-based editing is viable** - All required features (16-bit TIFF, WebGL2, 3D textures) are well-supported
2. **Use image-js/tiff** - Preserves 16-bit precision needed for exposure editing
3. **Raw WebGL2 preferred** - Three.js adds unnecessary complexity for this use case
4. **Performance is not a concern** - Sub-frame render times, reasonable memory usage
5. **Wide compatibility** - All modern browsers (2022+) support required features

## Recommendations

1. Implement using raw WebGL2 with single-pass exposure+LUT shader
2. Use image-js/tiff for TIFF decoding
3. Write simple .cube parser (text format, no library needed)
4. Detect WebGL2 support; fall back to static JPG comparison for older browsers
5. Keep preview TIFF at 2048px for good quality/size balance

## Sources

- UTIF.js: https://github.com/photopea/UTIF.js
- image-js/tiff: https://github.com/image-js/tiff
- WebGL Fundamentals - Image Processing: https://webglfundamentals.org/webgl/lessons/webgl-image-processing.html
- WebGPU 3D LUT Tutorial: https://webgpufundamentals.org/webgpu/lessons/webgpu-3dlut.html
- Three.js 3D LUT Example: https://threejs.org/examples/webgl_postprocessing_3dlut.html
- WebGL exposure library: https://github.com/actionnick/exposure
