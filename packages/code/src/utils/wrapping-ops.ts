/**
 * Text Wrapping Operations
 * Pure functions for handling text wrapping and physical line navigation
 */

/**
 * Wrap a logical line into multiple physical lines based on width
 */
export function wrapLine(line: string, width: number): string[] {
  if (line.length === 0) return [''];
  if (line.length <= width) return [line];

  const wrapped: string[] = [];
  let remaining = line;

  while (remaining.length > width) {
    wrapped.push(remaining.substring(0, width));
    remaining = remaining.substring(width);
  }

  if (remaining.length > 0) {
    wrapped.push(remaining);
  }

  return wrapped;
}

/**
 * Get physical cursor position (which wrapped line and column) from logical cursor position
 */
export function getPhysicalCursorPos(
  line: string,
  logicalCol: number,
  width: number
): { physicalLine: number; physicalCol: number } {
  const physicalLine = Math.floor(logicalCol / width);
  const physicalCol = logicalCol % width;
  return { physicalLine, physicalCol };
}

/**
 * Move cursor up one physical line (accounting for wrapping)
 */
export function moveCursorUpPhysical(
  value: string,
  cursor: number,
  width: number
): number {
  // If we're at position 0, can't go up
  if (cursor === 0) return cursor;

  // Calculate current physical position
  const beforeCursor = value.substring(0, cursor);
  const lines = beforeCursor.split('\n');
  const currentLogicalLine = lines.length - 1;
  const currentLogicalCol = lines[currentLogicalLine].length;

  const { physicalLine: currentPhysicalLine, physicalCol: currentPhysicalCol } =
    getPhysicalCursorPos(lines[currentLogicalLine], currentLogicalCol, width);

  // If we're not on the first physical line of this logical line, move up within it
  if (currentPhysicalLine > 0) {
    return cursor - width;
  }

  // We're on the first physical line of this logical line, need to move to previous logical line
  if (currentLogicalLine === 0) {
    // Already at first logical line
    return 0;
  }

  // Get previous logical line
  const prevLogicalLine = lines[currentLogicalLine - 1];
  const wrappedPrevLines = wrapLine(prevLogicalLine, width);
  const targetPhysicalLine = wrappedPrevLines.length - 1; // Last wrapped line of previous logical line

  // Try to maintain column position
  const targetPhysicalCol = Math.min(currentPhysicalCol, wrappedPrevLines[targetPhysicalLine].length);
  const targetLogicalCol = targetPhysicalLine * width + targetPhysicalCol;

  // Calculate absolute position
  const charsBeforePrevLine = lines.slice(0, currentLogicalLine - 1).reduce(
    (sum, line) => sum + line.length + 1, // +1 for \n
    0
  );

  return charsBeforePrevLine + targetLogicalCol;
}

/**
 * Move cursor down one physical line (accounting for wrapping)
 */
export function moveCursorDownPhysical(
  value: string,
  cursor: number,
  width: number
): number {
  // If we're at the end, can't go down
  if (cursor >= value.length) return cursor;

  // Calculate current physical position
  const beforeCursor = value.substring(0, cursor);
  const lines = beforeCursor.split('\n');
  const currentLogicalLine = lines.length - 1;
  const currentLogicalCol = lines[currentLogicalLine].length;

  // Get all logical lines
  const allLines = value.split('\n');
  const currentFullLine = allLines[currentLogicalLine];

  const { physicalLine: currentPhysicalLine, physicalCol: currentPhysicalCol } =
    getPhysicalCursorPos(currentFullLine, currentLogicalCol, width);

  const wrappedCurrentLines = wrapLine(currentFullLine, width);

  // If we're not on the last physical line of this logical line, move down within it
  if (currentPhysicalLine < wrappedCurrentLines.length - 1) {
    return cursor + width;
  }

  // We're on the last physical line of this logical line, need to move to next logical line
  if (currentLogicalLine >= allLines.length - 1) {
    // Already at last logical line
    return value.length;
  }

  // Get next logical line
  const nextLogicalLine = allLines[currentLogicalLine + 1];
  const wrappedNextLines = wrapLine(nextLogicalLine, width);

  // Try to maintain column position
  const targetPhysicalCol = Math.min(currentPhysicalCol, wrappedNextLines[0].length);

  // Calculate absolute position
  const charsBeforeNextLine = allLines.slice(0, currentLogicalLine + 1).reduce(
    (sum, line) => sum + line.length + 1, // +1 for \n
    0
  );

  return charsBeforeNextLine + targetPhysicalCol;
}
