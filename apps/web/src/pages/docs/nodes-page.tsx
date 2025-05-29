import NodesContent from "@/content/docs/nodes.mdx";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsNodesPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Nodes" },
  ]);

  return <NodesContent />;
}
