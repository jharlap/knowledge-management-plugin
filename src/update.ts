import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const CURRENT_VERSION: string = (_require('../package.json') as { version: string }).version;

const RELEASES_URL = 'https://api.github.com/repos/jharlap/knowledge-management-plugin/releases/latest';
const DOWNLOAD_URL = 'https://github.com/jharlap/knowledge-management-plugin/releases/latest';

let updateMessage: string | null = null;

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return (la ?? 0) > (ca ?? 0);
  if (lb !== cb) return (lb ?? 0) > (cb ?? 0);
  return (lc ?? 0) > (cc ?? 0);
}

export async function checkForUpdate(): Promise<void> {
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { 'User-Agent': `knowledge-management-plugin/${CURRENT_VERSION}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return;
    const data = await res.json() as { tag_name?: string };
    const latest = data.tag_name ?? '';
    if (latest && isNewer(latest, CURRENT_VERSION)) {
      updateMessage = `⚠️ Update available: ${latest} (you have ${CURRENT_VERSION}). Download: ${DOWNLOAD_URL}`;
    }
  } catch {
    // Network errors are expected (offline, firewall, etc.) — silently ignore
  }
}

export function getUpdateMessage(): string | null {
  return updateMessage;
}
