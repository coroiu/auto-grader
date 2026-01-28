'use client';

import { useCallback, useState, useRef } from 'react';
import { ImageEditor } from '@/components/ImageEditor';
import { ImageGrader } from '@/lib/webgl';

interface LutInfo {
  name: string;
  url: string;
}

interface EditPageClientProps {
  photoName: string;
  luts: LutInfo[];
}

export function EditPageClient({ photoName, luts }: EditPageClientProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const previewUrl = `/api/photos/${encodeURIComponent(photoName)}/preview`;
  const fullResUrl = `/api/photos/${encodeURIComponent(photoName)}/full-tiff`;

  const handleExport = useCallback(
    async (settings: { exposure: number; lut: string | null }) => {
      setIsExporting(true);
      setExportError(null);
      setExportProgress('Creating canvas...');

      try {
        // Create an offscreen canvas for full-res export
        if (!exportCanvasRef.current) {
          exportCanvasRef.current = document.createElement('canvas');
        }
        const canvas = exportCanvasRef.current;

        // Create a new ImageGrader for full-res processing
        setExportProgress('Loading full resolution TIFF...');
        const grader = new ImageGrader(canvas);

        try {
          // Load the full-res TIFF
          await grader.loadImage(fullResUrl);

          // Apply exposure
          setExportProgress('Applying exposure...');
          grader.setExposure(settings.exposure);

          // Apply LUT if selected
          if (settings.lut) {
            setExportProgress('Applying color grade...');
            const lutUrl = luts.find((l) => l.name === settings.lut)?.url;
            if (lutUrl) {
              await grader.loadLUT(lutUrl);
            }
          }

          // Export to blob
          setExportProgress('Generating JPG...');
          const blob = await grader.toBlob('image/jpeg', 0.95);

          // Create download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${photoName}-edited.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } finally {
          grader.dispose();
        }
      } catch (err) {
        console.error('Export failed:', err);
        setExportError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setIsExporting(false);
        setExportProgress('');
      }
    },
    [photoName, fullResUrl, luts]
  );

  return (
    <div>
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center max-w-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Exporting full resolution...</p>
            <p className="text-gray-500 text-sm mt-1">{exportProgress}</p>
          </div>
        </div>
      )}

      {exportError && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-300 font-medium">Export failed</p>
          <p className="text-red-400 text-sm mt-1">{exportError}</p>
          <button
            onClick={() => setExportError(null)}
            className="text-red-300 text-sm mt-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <ImageEditor
        photoName={photoName}
        previewUrl={previewUrl}
        luts={luts}
        onExport={handleExport}
      />

      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          About Advanced Editor
        </h3>
        <p className="text-sm text-gray-400">
          This editor loads a preview version of your RAW file and lets you
          adjust exposure and apply color grades (LUTs) in real-time using your
          browser&apos;s GPU. When you&apos;re happy with the result, click
          &quot;Export Full Resolution&quot; to generate a full-quality JPG with
          your adjustments applied.
        </p>
      </div>
    </div>
  );
}
