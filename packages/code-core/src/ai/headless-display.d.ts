/**
 * Headless Display
 * Formatting and display logic for headless mode (non-TUI)
 */
/**
 * Display callbacks for headless mode
 */
export declare function createHeadlessDisplay(quiet: boolean): {
    onToolCall: (toolName: string, args: unknown) => void;
    onToolResult: (toolName: string, result: unknown, duration: number) => void;
    onTextDelta: (text: string) => void;
    onComplete: () => void;
    hasOutput: () => boolean;
};
//# sourceMappingURL=headless-display.d.ts.map