/**
 * Preload entry point — loaded via `node --import dist/loader.js`.
 * Registers the ESM hook that redirects better-sqlite3 to our node:sqlite shim
 * before any module that depends on it (qmd) is imported.
 */
import { register } from 'module';

register('./hooks.js', import.meta.url);
