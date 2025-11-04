/**
 * Get runtime configuration/state
 * This can be extended to include more runtime context
 */
export function useRuntimeConfig() {
  return {
    isDebug: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true',
    isCI: process.env.CI === 'true',
    cwd: process.cwd(),
    platform: process.platform,
    nodeVersion: process.version,
  };
}

/**
 * Check if running in CI/CD environment
 */
export function useIsCI(): boolean {
  return process.env.CI === 'true' || !!process.env.CI || !!process.env.CONTINUOUS_INTEGRATION;
}

/**
 * Check if running in debug mode
 */
export function useIsDebug(): boolean {
  return process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
}
