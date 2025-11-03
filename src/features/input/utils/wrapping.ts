/**
 * Text Wrapping - Pure Functions
 * Handles text wrapping and cursor positioning in wrapped lines
 */

/**
 * Wrap a long line into physical lines based on terminal width
 * @pure No side effects
 */
export function wrapLine(text: string, width: number): string[] {
  if (text.length === 0) return [''];
  if (width <= 0) return [text];

  const wrapped: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= width) {
      wrapped.push(remaining);
      break;
    }

    // Take up to width characters
    wrapped.push(remaining.slice(0, width));
    remaining = remaining.slice(width);
  }

  return wrapped;
}

/**
 * Calculate physical cursor position after wrapping
 * @pure No side effects
 */
export function getPhysicalCursorPos(
  text: string,
  logicalCursor: number,
  terminalWidth: number
): {
  physicalLine: number;
  physicalCol: number;
} {
  if (terminalWidth <= 0) {
    return { physicalLine: 0, physicalCol: logicalCursor };
  }

  // Calculate which physical line the cursor is on
  const physicalLine = Math.floor(logicalCursor / terminalWidth);
  const physicalCol = logicalCursor % terminalWidth;

  return { physicalLine, physicalCol };
}

/**
 * Move cursor up one physical line (accounting for wrapping)
 * @pure No side effects
 */
export function moveCursorUpPhysical(
  value: string,
  cursor: number,
  terminalWidth: number
): number {
  if (terminalWidth <= 0) return cursor;

  // Find cursor's logical line
  const lines = value.split('\n');
  let charCount = 0;
  let logicalLine = 0;
  let posInLogicalLine = cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      logicalLine = i;
      posInLogicalLine = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  const currentLineText = lines[logicalLine];
  const { physicalLine: physicalIdx, physicalCol } = getPhysicalCursorPos(
    currentLineText,
    posInLogicalLine,
    terminalWidth
  );

  // If we're not on the first physical line of this logical line, move up within same logical line
  if (physicalIdx > 0) {
    const targetPhysicalLine = physicalIdx - 1;
    const targetPos = targetPhysicalLine * terminalWidth + physicalCol;
    // Clamp to line length
    const newPosInLine = Math.min(targetPos, currentLineText.length);

    // Calculate absolute cursor position
    let absolutePos = 0;
    for (let i = 0; i < logicalLine; i++) {
      absolutePos += lines[i].length + 1;
    }
    return absolutePos + newPosInLine;
  }

  // Otherwise, move to previous logical line
  if (logicalLine === 0) {
    // Already at first line
    return cursor;
  }

  // Move to previous logical line, same column if possible
  const prevLineText = lines[logicalLine - 1];
  const wrappedPrevLines = wrapLine(prevLineText, terminalWidth);
  const lastPhysicalLine = wrappedPrevLines.length - 1;

  // Try to maintain column position
  const targetPos = lastPhysicalLine * terminalWidth + physicalCol;
  const newPosInLine = Math.min(targetPos, prevLineText.length);

  // Calculate absolute position
  let absolutePos = 0;
  for (let i = 0; i < logicalLine - 1; i++) {
    absolutePos += lines[i].length + 1;
  }
  return absolutePos + newPosInLine;
}

/**
 * Move cursor down one physical line (accounting for wrapping)
 * @pure No side effects
 */
export function moveCursorDownPhysical(
  value: string,
  cursor: number,
  terminalWidth: number
): number {
  if (terminalWidth <= 0) return cursor;

  // Find cursor's logical line
  const lines = value.split('\n');
  let charCount = 0;
  let logicalLine = 0;
  let posInLogicalLine = cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      logicalLine = i;
      posInLogicalLine = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  const currentLineText = lines[logicalLine];
  const wrappedCurrentLines = wrapLine(currentLineText, terminalWidth);
  const { physicalLine: physicalIdx, physicalCol } = getPhysicalCursorPos(
    currentLineText,
    posInLogicalLine,
    terminalWidth
  );

  // If we're not on the last physical line of this logical line, move down within same logical line
  if (physicalIdx < wrappedCurrentLines.length - 1) {
    const targetPhysicalLine = physicalIdx + 1;
    const targetPos = targetPhysicalLine * terminalWidth + physicalCol;
    // Clamp to line length
    const newPosInLine = Math.min(targetPos, currentLineText.length);

    // Calculate absolute cursor position
    let absolutePos = 0;
    for (let i = 0; i < logicalLine; i++) {
      absolutePos += lines[i].length + 1;
    }
    return absolutePos + newPosInLine;
  }

  // Otherwise, move to next logical line
  if (logicalLine === lines.length - 1) {
    // Already at last line
    return cursor;
  }

  // Move to next logical line, first physical line, same column if possible
  const nextLineText = lines[logicalLine + 1];
  const newPosInLine = Math.min(physicalCol, nextLineText.length);

  // Calculate absolute position
  let absolutePos = 0;
  for (let i = 0; i <= logicalLine; i++) {
    absolutePos += lines[i].length + 1;
  }
  return absolutePos + newPosInLine;
}
