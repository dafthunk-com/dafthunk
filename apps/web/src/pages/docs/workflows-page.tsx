import WorkflowsContent from "@/content/docs/workflows.mdx";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsWorkflowsPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Workflows" },
  ]);

  return <WorkflowsContent />;
}
