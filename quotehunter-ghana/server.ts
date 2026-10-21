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

// Idempotent startup bootstrap (creates + aligns number sequences, grants them to the app user only).
// Failures are logged loudly but never block the server from starting.
runMigrations()
  .catch((err) => console.error('[Server] Startup migration failed (sequences may be missing):', err?.message || err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`QuoteHunter Ghana production server listening on port ${port}`);
    });
  });
