'use client';

import { useEffect, useState } from 'react';

interface Status {
  queue: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
  lutsCount: number;
  photosCount: number;
}

export function StatusBar() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Ignore errors
    }
  };

  const handleRescan = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/rescan', { method: 'POST' });
      await fetchStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const isProcessing = status.queue.active > 0 || status.queue.pending > 0;

  return (
    <div className="flex items-center gap-4 text-sm text-gray-400">
      {isProcessing && (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Processing {status.queue.active + status.queue.pending} file(s)
        </span>
      )}
      <span>{status.lutsCount} LUT{status.lutsCount !== 1 ? 's' : ''}</span>
      <button
        onClick={handleRescan}
        disabled={isRefreshing}
        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-50 transition-colors"
      >
        {isRefreshing ? 'Scanning...' : 'Rescan'}
      </button>
    </div>
  );
}
