// Every e2e / Lighthouse build lands under .offprint/ (gitignored) so the
// repository root shows only the real dist/. Paths are relative to the repo
// root, which is where `pnpm e2e` runs.
export const E2E_DIST = '.offprint/e2e/dist'
export const DUAL_STATIC = '.offprint/e2e/static'
export const DUAL_SERVER = '.offprint/e2e/server'
export const BASE_STATIC = '.offprint/e2e/base-static'
export const BASE_SERVER = '.offprint/e2e/base-server'
