/**
 * Get environment variables with type safety
 */
export function useEnv(): NodeJS.ProcessEnv {
  return process.env;
}

/**
 * Get specific environment variable with optional default
 */
export function useEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}
