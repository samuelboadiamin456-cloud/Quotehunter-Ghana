import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { createServerApp } from './src/server/app.ts';
import { runMigrations } from './src/db/migrate.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createServerApp();
const port = process.env.PORT || 3000;

// Serve static frontend in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Bind the port first so the host sees the service as up, then run the idempotent bootstrap
// (creates + aligns number sequences) in the background. Failures are logged, never fatal.
app.listen(port, () => {
  console.log(`QuoteHunter Ghana production server listening on port ${port}`);
  runMigrations().catch((err) =>
    console.error('[Server] Startup migration failed (sequences may be missing):', err?.message || err)
  );
});
