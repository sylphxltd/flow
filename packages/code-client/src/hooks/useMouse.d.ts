/**
 * Mouse tracking hook for Ink
 * Enables mouse support in terminal with click and hover events
 */
export interface MousePosition {
    x: number;
    y: number;
}
export interface MouseEvent {
    position: MousePosition;
    type: 'click' | 'move';
    button?: 'left' | 'right' | 'middle';
}
export declare function useMouse(enabled?: boolean): {
    position: MousePosition;
    lastClick: MouseEvent | null;
    clearClick: () => void;
};
//# sourceMappingURL=useMouse.d.ts.map