/**
 * Node.js ESM loader hook — redirects `better-sqlite3` imports to our node:sqlite shim.
 * Loaded via --import in the process args; runs in a dedicated hook worker context.
 */

type NextResolve = (s: string, c: object) => Promise<{ url: string }>;

export async function resolve(
  specifier: string,
  context: object,
  nextResolve: NextResolve,
) {
  if (specifier === 'better-sqlite3') {
    return {
      shortCircuit: true,
      url: new URL('./better-sqlite3-shim.js', import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
