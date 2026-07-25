import categories from "../../data/categories.json";

interface CategoryLike {
  id: string;
  nodeIds: string[];
}

const categoryList = (categories as { categories: CategoryLike[] }).categories;

// A node may legitimately appear in several category listings, but it must be
// advertised at exactly one URL. Without this, `/nodes/ai/cloudflare-model` and
// `/nodes/media/cloudflare-model` are two indexable pages with identical
// content — Google indexed both and self-canonicalized each rather than
// consolidating them. Declaration order in categories.json picks the winner.
const canonicalCategoryByNode = new Map<string, string>();
for (const category of categoryList) {
  for (const nodeId of category.nodeIds) {
    if (!canonicalCategoryByNode.has(nodeId)) {
      canonicalCategoryByNode.set(nodeId, category.id);
    }
  }
}

/** The single indexable path for a node, regardless of which listing links it. */
export function canonicalNodePath(nodeId: string, fallbackCategoryId: string) {
  const categoryId = canonicalCategoryByNode.get(nodeId) ?? fallbackCategoryId;
  return `/nodes/${categoryId}/${nodeId}`;
}

/** Every node path that belongs in the sitemap — one per node, deduplicated. */
export function canonicalNodePaths(): string[] {
  return [...canonicalCategoryByNode].map(
    ([nodeId, categoryId]) => `/nodes/${categoryId}/${nodeId}`
  );
}
