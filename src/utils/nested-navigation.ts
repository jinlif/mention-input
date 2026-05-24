/**
 * Shared utilities for nested/tree navigation in suggestion panels.
 */

export interface SearchResult<T> {
  item: T;
  path: string[];
}

/**
 * Get the children of an item, treating empty arrays as no children.
 */
export function getChildren<T extends { children?: T[] }>(item: T): T[] | undefined {
  const c = item.children;
  return c && c.length > 0 ? c : undefined;
}

/**
 * Get items at the current navigation level.
 * If stack is empty, returns root items.
 * Otherwise returns the children of the top of the stack.
 */
export function getCurrentLevelItems<T extends { children?: T[] }>(
  rootItems: T[],
  stack: T[],
): T[] {
  if (stack.length === 0) return rootItems;
  const parent = stack[stack.length - 1];
  return getChildren(parent) ?? [];
}

/**
 * Recursively search all levels of the tree, returning matching items with their full paths.
 */
export function searchAllLevels<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getChildren: (item: T) => T[] | undefined,
  path: string[] = [],
): SearchResult<T>[] {
  const results: SearchResult<T>[] = [];
  const lower = query.toLowerCase();

  for (const item of items) {
    const label = getLabel(item);
    const currentPath = [...path, label];

    if (label.toLowerCase().includes(lower)) {
      results.push({ item, path: currentPath });
    }

    const children = getChildren(item);
    if (children) {
      results.push(...searchAllLevels(children, query, getLabel, getChildren, currentPath));
    }
  }

  return results;
}

