/** Shared alphabetical sibling ordering for account hierarchies. */
export type HierarchyNode<T> = T & { children: HierarchyNode<T>[] };
export function buildHierarchy<
  T extends { id: string; parentId: string | null; name: string },
>(rows: T[]): HierarchyNode<T>[] {
  const nodes = new Map<string, HierarchyNode<T>>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );
  const roots: HierarchyNode<T>[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: HierarchyNode<T>[]) => {
    list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    for (const node of list) sort(node.children);
  };
  sort(roots);
  return roots;
}
