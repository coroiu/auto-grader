/**
 * Parser for Adobe/Iridas .cube LUT files
 *
 * .cube format reference:
 * - Lines starting with # are comments
 * - TITLE "name" sets the LUT title
 * - LUT_3D_SIZE N sets the cube dimension (e.g., 33 means 33x33x33)
 * - DOMAIN_MIN r g b sets the input range minimum (default 0 0 0)
 * - DOMAIN_MAX r g b sets the input range maximum (default 1 1 1)
 * - Data lines contain R G B float triplets
 * - Data order: R varies fastest, then G, then B (matches OpenGL 3D texture layout)
 */

export interface CubeLUT {
  title: string;
  size: number;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  data: Float32Array; // RGBA format for WebGL (size^3 * 4 elements)
}

/**
 * Parse a .cube LUT file content into a structured object
 */
export function parseCubeLUT(content: string): CubeLUT {
  const lines = content.split('\n');
  let title = '';
  let size = 0;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const rgbValues: number[] = [];

  let inData = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip comments and empty lines
    if (line.startsWith('#') || line === '') continue;

    // Parse header keywords
    if (line.startsWith('TITLE')) {
      // TITLE "Some Name" or TITLE Some Name
      title = line.replace(/^TITLE\s*/, '').replace(/^"|"$/g, '').trim();
      continue;
    }

    if (line.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/);
      size = parseInt(parts[1], 10);
      inData = true;
      continue;
    }

    if (line.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/);
      domainMin = [
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ];
      continue;
    }

    if (line.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/);
      domainMax = [
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ];
      continue;
    }

    // Skip other header keywords (LUT_1D_SIZE, etc.)
    if (/^[A-Z_]+/.test(line) && !inData) {
      continue;
    }

    // Parse data lines (R G B triplets)
    if (inData) {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);

        // Skip invalid lines
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          rgbValues.push(r, g, b);
        }
      }
    }
  }

  if (size === 0) {
    throw new Error('Invalid .cube file: LUT_3D_SIZE not found');
  }

  const expectedValues = size * size * size * 3;
  if (rgbValues.length !== expectedValues) {
    throw new Error(
      `Invalid .cube file: expected ${expectedValues} values, got ${rgbValues.length}`
    );
  }

  // Convert RGB to RGBA (WebGL 3D textures work better with RGBA)
  const rgbaData = new Float32Array(size * size * size * 4);
  for (let i = 0; i < size * size * size; i++) {
    rgbaData[i * 4 + 0] = rgbValues[i * 3 + 0]; // R
    rgbaData[i * 4 + 1] = rgbValues[i * 3 + 1]; // G
    rgbaData[i * 4 + 2] = rgbValues[i * 3 + 2]; // B
    rgbaData[i * 4 + 3] = 1.0; // A
  }

  return {
    title: title || 'Untitled',
    size,
    domainMin,
    domainMax,
    data: rgbaData,
  };
}
