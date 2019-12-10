import * as path from 'path';

/**
 * Reset worker modules in Node.js so that we can re-instantiate Remote DOM.
 * Because modules under worker-thread uses global variables and we need to
 * reload modules to init Remote DOM multiple times.
 */
export function resetWorkerModules(): void {
  const dir = __dirname + path.sep;
  for (const key in require.cache) {
    if (key.startsWith(dir)) {
      delete require.cache[key];
    }
  }
}
