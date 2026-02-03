'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ImageGrader, CubeLUT } from '@/lib/webgl';
import type { PhotoMetadata } from '@/lib/processing/state';

interface LutInfo {
  name: string;
  url: string;
}

interface EditingSession {
  exposure: number;
  selectedLut: string | null;
  lutEnabled: boolean;
  temperature: number;
  tint: number;
  lastModified: string;
}

interface ImageEditorProps {
  photoName: string;
  previewUrl: string;
  luts: LutInfo[];
  metadata?: PhotoMetadata | null;
  onExport?: (settings: { exposure: number; lut: string | null; temperature: number; tint: number }) => void;
}

export function ImageEditor({
  photoName,
  previewUrl,
  luts,
  metadata,
  onExport,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graderRef = useRef<ImageGrader | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  // Extract and clamp EXIF WB defaults from metadata
  const defaultTemperature = useMemo(() => {
    const kelvin = metadata?.whiteBalanceKelvin || 6500;
    return Math.max(2000, Math.min(10000, kelvin));
  }, [metadata?.whiteBalanceKelvin]);

  const defaultTint = useMemo(() => {
    const tint = metadata?.whiteBalanceTint || 0;
    return Math.max(-1, Math.min(1, tint));
  }, [metadata?.whiteBalanceTint]);

  const [exposure, setExposure] = useState(0);
  const [selectedLut, setSelectedLut] = useState<string | null>(null);
  const [lutEnabled, setLutEnabled] = useState(true);
  const [currentLutInfo, setCurrentLutInfo] = useState<CubeLUT | null>(null);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const [tint, setTint] = useState(defaultTint);

  // LocalStorage key for this photo's editing session
  const storageKey = `auto-grader:edit:${photoName}`;

  // Load saved session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const session: EditingSession = JSON.parse(saved);
        setExposure(session.exposure);
        setSelectedLut(session.selectedLut);
        setLutEnabled(session.lutEnabled);
        // Use session values if available, otherwise fall back to EXIF defaults
        setTemperature(session.temperature ?? defaultTemperature);
        setTint(session.tint ?? defaultTint);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey, defaultTemperature, defaultTint]);

  // Save session to localStorage (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const session: EditingSession = {
          exposure,
          selectedLut,
          lutEnabled,
          temperature,
          tint,
          lastModified: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(session));
      } catch {
        // Ignore localStorage errors
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [exposure, selectedLut, lutEnabled, temperature, tint, storageKey]);

  // Initialize WebGL and load image
  useEffect(() => {
    if (!canvasRef.current) return;

    let disposed = false;
    const grader = new ImageGrader(canvasRef.current);
    graderRef.current = grader;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingMessage('Loading preview...');

        await grader.loadImage(previewUrl);

        if (disposed) return;

        // If there's a saved LUT selection, load it
        if (selectedLut) {
          const lutInfo = luts.find((l) => l.name === selectedLut);
          if (lutInfo) {
            setLoadingMessage('Loading LUT...');
            const info = await grader.loadLUT(lutInfo.url);
            setCurrentLutInfo(info);
          }
        }

        setIsLoading(false);
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      disposed = true;
      grader.dispose();
      graderRef.current = null;
    };
    // Note: Only re-initialize on previewUrl change, not on selectedLut change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // Load LUT when selection changes
  useEffect(() => {
    const grader = graderRef.current;
    if (!grader || isLoading) return;

    const loadLut = async () => {
      if (!selectedLut) {
        grader.clearLUT();
        setCurrentLutInfo(null);
        return;
      }

      const lutInfo = luts.find((l) => l.name === selectedLut);
      if (!lutInfo) return;

      try {
        const info = await grader.loadLUT(lutInfo.url);
        setCurrentLutInfo(info);
      } catch (err) {
        console.error('Failed to load LUT:', err);
        setSelectedLut(null);
        setCurrentLutInfo(null);
      }
    };

    loadLut();
  }, [selectedLut, luts, isLoading]);

  // Update exposure in real-time
  const handleExposureChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setExposure(value);
      graderRef.current?.setExposure(value);
    },
    []
  );

  // Reset exposure to 0
  const resetExposure = useCallback(() => {
    setExposure(0);
    graderRef.current?.setExposure(0);
  }, []);

  // Update temperature in real-time
  const handleTemperatureChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setTemperature(value);
      graderRef.current?.setTemperature(value);
    },
    []
  );

  // Reset temperature to EXIF default
  const resetTemperature = useCallback(() => {
    setTemperature(defaultTemperature);
    graderRef.current?.setTemperature(defaultTemperature);
  }, [defaultTemperature]);

  // Update tint in real-time
  const handleTintChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setTint(value);
      graderRef.current?.setTint(value);
    },
    []
  );

  // Reset tint to EXIF default
  const resetTint = useCallback(() => {
    setTint(defaultTint);
    graderRef.current?.setTint(defaultTint);
  }, [defaultTint]);

  // Toggle LUT
  const toggleLut = useCallback(() => {
    setLutEnabled((prev) => {
      const newValue = !prev;
      graderRef.current?.setLUTEnabled(newValue);
      return newValue;
    });
  }, []);

  // Handle LUT selection
  const handleLutSelect = useCallback((lutName: string | null) => {
    setSelectedLut(lutName);
    setLutEnabled(true);
    graderRef.current?.setLUTEnabled(true);
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    onExport?.({ exposure, lut: selectedLut, temperature, tint });
  }, [exposure, selectedLut, temperature, tint, onExport]);

  // Clear session
  const clearSession = useCallback(() => {
    setExposure(0);
    setSelectedLut(null);
    setLutEnabled(true);
    setTemperature(defaultTemperature);
    setTint(defaultTint);
    graderRef.current?.setExposure(0);
    graderRef.current?.clearLUT();
    graderRef.current?.setLUTEnabled(true);
    graderRef.current?.setTemperature(defaultTemperature);
    graderRef.current?.setTint(defaultTint);
    setCurrentLutInfo(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [storageKey, defaultTemperature, defaultTint]);

  return (
    <div className="space-y-6">
      {/* Canvas container */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">{loadingMessage}</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-center text-red-400">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
        />
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {/* Exposure slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">
              Exposure
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-mono w-16 text-right">
                {exposure > 0 ? '+' : ''}
                {exposure.toFixed(2)} EV
              </span>
              <button
                onClick={resetExposure}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.05"
            value={exposure}
            onChange={handleExposureChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>-3 EV</span>
            <span>0</span>
            <span>+3 EV</span>
          </div>
        </div>

        {/* White Balance - Temperature slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">
              Temperature
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-mono w-16 text-right">
                {temperature}K
              </span>
              <button
                onClick={resetTemperature}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          <input
            type="range"
            min="2000"
            max="10000"
            step="50"
            value={temperature}
            onChange={handleTemperatureChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Warm (2000K)</span>
            <span>Daylight (6500K)</span>
            <span>Cool (10000K)</span>
          </div>
        </div>

        {/* White Balance - Tint slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">
              Tint
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-mono w-16 text-right">
                {tint > 0 ? '+' : ''}
                {tint.toFixed(2)}
              </span>
              <button
                onClick={resetTint}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={tint}
            onChange={handleTintChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Green (-1.0)</span>
            <span>Neutral (0)</span>
            <span>Magenta (+1.0)</span>
          </div>
        </div>

        {/* LUT selector */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">
              Color Grade (LUT)
            </label>
            {selectedLut && (
              <button
                onClick={toggleLut}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  lutEnabled
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                }`}
              >
                {lutEnabled ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleLutSelect(null)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                selectedLut === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              None
            </button>
            {luts.map((lut) => (
              <button
                key={lut.name}
                onClick={() => handleLutSelect(lut.name)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  selectedLut === lut.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {lut.name}
              </button>
            ))}
          </div>
          {currentLutInfo && selectedLut && (
            <p className="text-xs text-gray-500">
              LUT: {currentLutInfo.title} ({currentLutInfo.size}x
              {currentLutInfo.size}x{currentLutInfo.size})
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-800">
          {onExport && (
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              Export Full Resolution
            </button>
          )}
          <a
            href={`/api/photos/${encodeURIComponent(photoName)}/raw`}
            download
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors inline-block"
          >
            Download RAW Original
          </a>
          <button
            onClick={clearSession}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          >
            Reset All
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500">
          Your edits are automatically saved and will be restored when you
          return.
        </p>
      </div>
    </div>
  );
}
