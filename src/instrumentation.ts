export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import watcher directly (not from barrel file) to avoid bundling issues
    const { startWatcher } = await import('@/lib/processing/watcher');

    console.log('[INIT] Starting Auto Grader...');

    // Create data directories if they don't exist
    const { promises: fs } = await import('fs');
    const { config } = await import('@/lib/processing');

    try {
      await fs.mkdir(config.inboxDir, { recursive: true });
      await fs.mkdir(config.outputDir, { recursive: true });
      await fs.mkdir(config.lutsDir, { recursive: true });
      console.log('[INIT] Data directories ensured');
    } catch (err) {
      console.error('[INIT] Failed to create directories:', err);
    }

    // Start the file watcher
    try {
      await startWatcher();
      console.log('[INIT] File watcher started');
    } catch (err) {
      console.error('[INIT] Failed to start watcher:', err);
    }
  }
}
