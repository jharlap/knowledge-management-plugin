/**
 * Shim that satisfies better-sqlite3's module contract using node:sqlite.
 *
 * node:sqlite's DatabaseSync API is intentionally compatible with better-sqlite3
 * for the operations qmd uses: new Database(path), db.exec(), db.prepare().get/all/run().
 *
 * Extension loading (sqlite-vec) requires allowExtensionLoading:true, which
 * better-sqlite3 enables by default but node:sqlite does not. We wrap the
 * constructor to always enable it so sqlite-vec loads normally.
 */
import { DatabaseSync } from 'node:sqlite';

class Database extends DatabaseSync {
  constructor(path: string, options?: ConstructorParameters<typeof DatabaseSync>[1]) {
    super(path, { ...options, allowExtension: true });
  }
}

export default Database;
