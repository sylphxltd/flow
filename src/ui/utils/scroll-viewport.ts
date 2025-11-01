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
export function calculateScrollViewport<T>(
  items: T[],
  selectedIndex: number,
  pageSize: number = 10
): ScrollViewportResult<T> {
  // Calculate scroll offset to keep selected item centered
  const scrollOffset = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(pageSize / 2), items.length - pageSize)
  );

  const visibleItems = items.slice(scrollOffset, scrollOffset + pageSize);
  const hasItemsAbove = scrollOffset > 0;
  const hasItemsBelow = scrollOffset + pageSize < items.length;
  const itemsAboveCount = scrollOffset;
  const itemsBelowCount = items.length - scrollOffset - pageSize;

  return {
    visibleItems,
    scrollOffset,
    hasItemsAbove,
    hasItemsBelow,
    itemsAboveCount,
    itemsBelowCount,
  };
}
