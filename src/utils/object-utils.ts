/**
 * Object utility functions
 * Helper functions for working with nested objects
 */

/**
 * Get a nested property from an object using dot notation
 */
export function getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  return keys.reduce((current, key) => current?.[key], obj);
}

/**
 * Set a nested property on an object using dot notation
 */
export function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;

  const target = keys.reduce((current, key) => {
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key] as Record<string, unknown>;
  }, obj);

  target[lastKey] = value;
}

/**
 * Delete a nested property from an object using dot notation
 */
export function deleteNestedProperty(obj: Record<string, unknown>, path: string): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;

  const target = keys.reduce((current, key) => {
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
      return current[key] as Record<string, unknown>;
    }
    return current[key] as Record<string, unknown>;
  }, obj);

  delete target[lastKey];
}
