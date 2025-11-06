/**
 * Cursor Utilities
 * Helper functions for cursor positioning and navigation in multiline text
 */
export interface LinePosition {
    line: number;
    column: number;
}
/**
 * Convert absolute cursor position to line and column
 */
export declare function getCursorLinePosition(text: string, cursor: number): LinePosition;
/**
 * Convert line and column to absolute cursor position
 */
export declare function getAbsoluteCursorPosition(text: string, line: number, column: number): number;
/**
 * Move cursor up one line, preserving column if possible
 */
export declare function moveCursorUp(text: string, cursor: number): number;
/**
 * Move cursor down one line, preserving column if possible
 */
export declare function moveCursorDown(text: string, cursor: number): number;
/**
 * Safe cursor setter - clamps to valid range [0, text.length]
 */
export declare function clampCursor(cursor: number, textLength: number): number;
//# sourceMappingURL=cursor-utils.d.ts.map