import { NodesBrowser } from "@/components/docs/nodes-browser";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsNodesLibraryPage() {
  usePageBreadcrumbs([{ label: "Node Library" }]);

  return (
    <>
      {/* Header */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Node Library</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Explore and search through all available nodes using our interactive
          browser. Filter by tag, name, and description in real-time to quickly
          find the tools you need for your workflows.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none docs-content">
        <NodesBrowser />
      </div>
    </>
  );
}
