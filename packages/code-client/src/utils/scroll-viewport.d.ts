/**
 * Scroll Viewport Utilities
 * Calculate scrolling window for option lists
 */
export interface ScrollViewportResult<T> {
    visibleItems: T[];
    scrollOffset: number;
    hasItemsAbove: boolean;
    hasItemsBelow: boolean;
    itemsAboveCount: number;
    itemsBelowCount: number;
}
/**
 * Calculate scroll viewport for a list of items
 * Keeps the selected item centered in the visible window
 */
export declare function calculateScrollViewport<T>(items: T[], selectedIndex: number, pageSize?: number): ScrollViewportResult<T>;
//# sourceMappingURL=scroll-viewport.d.ts.map