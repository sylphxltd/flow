/**
 * Logging utilities for console output with colors
 */

/**
 * Log a message with color
 * @param message - Message to log
 * @param color - Color name (red, green, yellow, blue, magenta, cyan, white)
 */
export function log(message: string, color = 'white'): void {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
  };

  const colorCode = colors[color as keyof typeof colors] || colors.white;
  console.log(`${colorCode}${message}${colors.reset}`);
}