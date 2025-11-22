/**
 * Version Utilities
 * Semantic version comparison and validation
 */

/**
 * Compare two semantic version strings
 * @returns Negative if v1 < v2, positive if v1 > v2, zero if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] !== parts2[i]) {
      return parts1[i] - parts2[i];
    }
  }

  return parts1.length - parts2.length;
}

/**
 * Check if current version is outdated compared to latest
 */
export function isVersionOutdated(current: string, latest: string): boolean {
  try {
    return compareVersions(current, latest) < 0;
  } catch {
    return false;
  }
}

/**
 * Parse version string into components
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const parts = version.split('.').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) {
    return null;
  }
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
  };
}
