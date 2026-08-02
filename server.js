// Production Entrypoint Shim for Cloud Run
// Handles platforms executing 'node server.js' directly
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  require('./dist/server.cjs');
} catch (e) {
  console.error("Failed to load dist/server.cjs. Ensure 'npm run build' was executed during build step.", e);
  process.exit(1);
}

