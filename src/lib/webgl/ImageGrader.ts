/**
 * WebGL2-based image grader for real-time exposure adjustment and LUT application
 *
 * Designed for photography editing with:
 * - 16-bit TIFF input (preserved as float textures)
 * - Exposure adjustment in EV stops
 * - 3D LUT application for color grading
 * - sRGB output for display
 */

import { decode } from 'tiff';
import { CubeLUT, parseCubeLUT } from './cubeLutParser';

interface UniformLocations {
  uImage: WebGLUniformLocation | null;
  uLUT: WebGLUniformLocation | null;
  uExposure: WebGLUniformLocation | null;
  uLUTSize: WebGLUniformLocation | null;
  uLUTEnabled: WebGLUniformLocation | null;
}

export class ImageGrader {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms: UniformLocations;
  private imageTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private lutSize: number = 0;
  private vao: WebGLVertexArrayObject;

  // Image dimensions
  private imageWidth: number = 0;
  private imageHeight: number = 0;

  // Current state
  private exposure: number = 0;
  private lutEnabled: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    // Check for required extension
    const floatTextureExt = gl.getExtension('EXT_color_buffer_float');
    if (!floatTextureExt) {
      console.warn('EXT_color_buffer_float not available');
    }

    // Compile shaders and create program
    this.program = this.createProgram();

    // Get uniform locations
    this.uniforms = {
      uImage: gl.getUniformLocation(this.program, 'uImage'),
      uLUT: gl.getUniformLocation(this.program, 'uLUT'),
      uExposure: gl.getUniformLocation(this.program, 'uExposure'),
      uLUTSize: gl.getUniformLocation(this.program, 'uLUTSize'),
      uLUTEnabled: gl.getUniformLocation(this.program, 'uLUTEnabled'),
    };

    // Create empty VAO for fullscreen triangle (no attributes needed)
    this.vao = gl.createVertexArray()!;
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;

    // Vertex shader - fullscreen triangle technique
    // More efficient than a quad (3 vertices vs 6)
    const vsSource = `#version 300 es
      out vec2 vTexCoord;
      void main() {
        // Generate fullscreen triangle vertices
        float x = float((gl_VertexID & 1) << 2);
        float y = float((gl_VertexID & 2) << 1);
        gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
        // Flip Y for image coordinates (top-left origin)
        vTexCoord = vec2(x * 0.5, 1.0 - y * 0.5);
      }
    `;

    // Fragment shader - exposure adjustment + LUT application + sRGB conversion
    const fsSource = `#version 300 es
      precision highp float;
      precision highp sampler3D;

      in vec2 vTexCoord;
      out vec4 fragColor;

      uniform sampler2D uImage;
      uniform sampler3D uLUT;
      uniform float uExposure;   // In stops (EV)
      uniform float uLUTSize;    // LUT dimension (e.g., 33.0)
      uniform bool uLUTEnabled;  // Toggle LUT on/off

      void main() {
        // Sample source image (linear RGB)
        vec3 color = texture(uImage, vTexCoord).rgb;

        // Apply exposure adjustment (in stops/EV)
        // pow(2.0, exposure) is the standard photographic exposure formula
        color *= pow(2.0, uExposure);

        // Clamp to valid range before LUT lookup
        color = clamp(color, 0.0, 1.0);

        // Apply 3D LUT if enabled
        if (uLUTEnabled && uLUTSize > 0.0) {
          // Scale coordinates to account for LUT texel centers
          // This ensures we sample at the center of each LUT cell
          float scale = (uLUTSize - 1.0) / uLUTSize;
          float offset = 0.5 / uLUTSize;
          vec3 lutCoord = color * scale + offset;

          color = texture(uLUT, lutCoord).rgb;
        }

        // Apply sRGB gamma for display (linear -> sRGB)
        // This is the inverse of the sRGB EOTF
        color = mix(
          color * 12.92,
          1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
          step(0.0031308, color)
        );

        fragColor = vec4(color, 1.0);
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      throw new Error('Program link failed: ' + error);
    }

    // Clean up individual shaders (attached to program now)
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compile failed: ' + error);
    }

    return shader;
  }

  /**
   * Load a TIFF image from a URL or ArrayBuffer
   */
  async loadImage(source: string | ArrayBuffer): Promise<void> {
    let buffer: ArrayBuffer;

    if (typeof source === 'string') {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      buffer = await response.arrayBuffer();
    } else {
      buffer = source;
    }

    // Decode TIFF
    const ifds = decode(buffer);
    if (ifds.length === 0) {
      throw new Error('No images found in TIFF');
    }

    const ifd = ifds[0];
    const width = ifd.width;
    const height = ifd.height;
    const rawData = ifd.data;

    this.imageWidth = width;
    this.imageHeight = height;

    const gl = this.gl;

    // Resize canvas to match image aspect ratio
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);

    // Determine number of channels and convert to normalized float
    const totalPixels = width * height;
    const channels = rawData.length / totalPixels;
    const floatData = new Float32Array(totalPixels * 4);

    // Handle different bit depths and channel counts
    const isUint16 = rawData instanceof Uint16Array;
    const isFloat32 = rawData instanceof Float32Array;
    const maxValue = isUint16 ? 65535 : isFloat32 ? 1.0 : 255;

    for (let i = 0; i < totalPixels; i++) {
      if (channels === 1) {
        // Grayscale
        const v = (rawData[i] as number) / maxValue;
        floatData[i * 4 + 0] = v;
        floatData[i * 4 + 1] = v;
        floatData[i * 4 + 2] = v;
        floatData[i * 4 + 3] = 1.0;
      } else if (channels === 3) {
        // RGB
        floatData[i * 4 + 0] = (rawData[i * 3 + 0] as number) / maxValue;
        floatData[i * 4 + 1] = (rawData[i * 3 + 1] as number) / maxValue;
        floatData[i * 4 + 2] = (rawData[i * 3 + 2] as number) / maxValue;
        floatData[i * 4 + 3] = 1.0;
      } else if (channels === 4) {
        // RGBA
        floatData[i * 4 + 0] = (rawData[i * 4 + 0] as number) / maxValue;
        floatData[i * 4 + 1] = (rawData[i * 4 + 1] as number) / maxValue;
        floatData[i * 4 + 2] = (rawData[i * 4 + 2] as number) / maxValue;
        floatData[i * 4 + 3] = (rawData[i * 4 + 3] as number) / maxValue;
      }
    }

    // Create/update texture
    if (this.imageTexture) {
      gl.deleteTexture(this.imageTexture);
    }
    this.imageTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      width,
      height,
      0,
      gl.RGBA,
      gl.FLOAT,
      floatData
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.render();
  }

  /**
   * Load a LUT from a URL or string content
   */
  async loadLUT(source: string, isContent: boolean = false): Promise<CubeLUT> {
    let content: string;

    if (isContent) {
      content = source;
    } else {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch LUT: ${response.status}`);
      }
      content = await response.text();
    }

    const lut = parseCubeLUT(content);

    const gl = this.gl;

    // Clean up old LUT texture
    if (this.lutTexture) {
      gl.deleteTexture(this.lutTexture);
    }

    // Create 3D texture
    this.lutTexture = gl.createTexture();
    this.lutSize = lut.size;

    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA32F,
      lut.size,
      lut.size,
      lut.size,
      0,
      gl.RGBA,
      gl.FLOAT,
      lut.data
    );

    // LINEAR filtering is crucial for smooth color interpolation
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    this.render();
    return lut;
  }

  /**
   * Clear the currently loaded LUT
   */
  clearLUT(): void {
    if (this.lutTexture) {
      this.gl.deleteTexture(this.lutTexture);
      this.lutTexture = null;
    }
    this.lutSize = 0;
    this.render();
  }

  /**
   * Set exposure adjustment in EV stops
   */
  setExposure(stops: number): void {
    this.exposure = stops;
    this.render();
  }

  /**
   * Get current exposure value
   */
  getExposure(): number {
    return this.exposure;
  }

  /**
   * Toggle LUT on/off (for A/B comparison)
   */
  setLUTEnabled(enabled: boolean): void {
    this.lutEnabled = enabled;
    this.render();
  }

  /**
   * Get whether LUT is enabled
   */
  isLUTEnabled(): boolean {
    return this.lutEnabled;
  }

  /**
   * Get image dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.imageWidth, height: this.imageHeight };
  }

  /**
   * Render the current state to the canvas
   */
  render(): void {
    const gl = this.gl;

    if (!this.imageTexture) {
      // Nothing to render
      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Bind image texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(this.uniforms.uImage, 0);

    // Bind LUT texture to unit 1
    gl.activeTexture(gl.TEXTURE1);
    if (this.lutTexture) {
      gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    }
    gl.uniform1i(this.uniforms.uLUT, 1);

    // Set uniforms
    gl.uniform1f(this.uniforms.uExposure, this.exposure);
    gl.uniform1f(this.uniforms.uLUTSize, this.lutSize);
    gl.uniform1i(this.uniforms.uLUTEnabled, this.lutEnabled ? 1 : 0);

    // Draw fullscreen triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * Export the current canvas content as a data URL
   */
  toDataURL(type: string = 'image/jpeg', quality: number = 0.95): string {
    this.render();
    return (this.gl.canvas as HTMLCanvasElement).toDataURL(type, quality);
  }

  /**
   * Export the current canvas content as a Blob
   */
  async toBlob(
    type: string = 'image/jpeg',
    quality: number = 0.95
  ): Promise<Blob> {
    this.render();
    return new Promise((resolve, reject) => {
      (this.gl.canvas as HTMLCanvasElement).toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    const gl = this.gl;

    if (this.imageTexture) {
      gl.deleteTexture(this.imageTexture);
      this.imageTexture = null;
    }

    if (this.lutTexture) {
      gl.deleteTexture(this.lutTexture);
      this.lutTexture = null;
    }

    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
  }
}
