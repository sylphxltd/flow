/**
 * Byte Formatting Utilities
 * Shared utilities for formatting byte sizes with configurable options
 */

export interface ByteFormatOptions {
  /** Decimal places to round to (default: 2) */
  decimals?: number;
  /** Use short unit names like 'B', 'KB' instead of 'Bytes', 'KB' (default: false) */
  shortUnits?: boolean;
}

/**
 * Format bytes to human-readable size
 * Pure - number to string formatting
 *
 * @param bytes - The number of bytes to format
 * @param options - Formatting options
 * @returns Formatted string like "1.5 MB" or "2.3 KB"
 *
 * @example
 * formatBytes(0) // '0 Bytes'
 * formatBytes(1024) // '1 KB'
 * formatBytes(1536, { decimals: 1 }) // '1.5 KB'
 * formatBytes(1024, { shortUnits: true }) // '1 KB'
 * formatBytes(0, { shortUnits: true }) // '0 B'
 */
export function formatBytes(bytes: number, options: ByteFormatOptions = {}): string {
  const { decimals = 2, shortUnits = false } = options;

  const units = shortUnits
    ? ['B', 'KB', 'MB', 'GB', 'TB']
    : ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  if (bytes === 0) {
    return `0 ${units[0]}`;
  }

  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);

  // Format with specified decimal places
  const formatted = value.toFixed(decimals);

  // Remove trailing zeros and decimal point if not needed
  const trimmed = decimals > 0 ? formatted.replace(/\.?0+$/, '') : formatted;

  return `${trimmed} ${units[i]}`;
}

/**
 * Format file size - alias for formatBytes with 1 decimal place
 * Kept for backward compatibility
 *
 * @param bytes - The number of bytes to format
 * @returns Formatted string like "1.5 MB"
 *
 * @example
 * formatFileSize(1536) // '1.5 KB'
 * formatFileSize(1048576) // '1.0 MB'
 */
export function formatFileSize(bytes: number): string {
  return formatBytes(bytes, { decimals: 1, shortUnits: true });
}
