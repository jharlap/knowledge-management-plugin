/**
 * Shim that satisfies better-sqlite3's module contract using node:sqlite.
 *
 * node:sqlite's DatabaseSync API is intentionally compatible with better-sqlite3
 * for the operations qmd uses: new Database(path), db.exec(), db.prepare().get/all/run().
 *
 * sqlite-vec extension loading will fail (node:sqlite requires allowExtensionLoading:true
 * and a different load path), but qmd already handles that gracefully — BM25 search
 * works fine without vector embeddings.
 */
import { DatabaseSync } from 'node:sqlite';

export default DatabaseSync;
