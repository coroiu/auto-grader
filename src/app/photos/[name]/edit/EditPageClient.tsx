'use client';

import { useCallback, useState } from 'react';
import { ImageEditor } from '@/components/ImageEditor';

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
  const [exportError, setExportError] = useState<string | null>(null);

  const previewUrl = `/api/photos/${encodeURIComponent(photoName)}/preview`;

  const handleExport = useCallback(
    async (settings: { exposure: number; lut: string | null }) => {
      setIsExporting(true);
      setExportError(null);

      try {
        // Build export URL with query params
        const params = new URLSearchParams();
        params.set('exposure', settings.exposure.toString());
        if (settings.lut) {
          params.set('lut', settings.lut);
        }

        const exportUrl = `/api/photos/${encodeURIComponent(photoName)}/export?${params.toString()}`;

        // Fetch the exported image
        const response = await fetch(exportUrl);
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `Export failed: ${response.status}`);
        }

        // Get the blob and create download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `${photoName}-edited.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up
        URL.revokeObjectURL(url);
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setIsExporting(false);
      }
    },
    [photoName]
  );

  return (
    <div>
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Exporting full resolution...</p>
            <p className="text-gray-500 text-sm mt-1">
              This may take a moment
            </p>
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
