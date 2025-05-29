import OverviewContent from "@/content/docs/overview.mdx";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsOverviewPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Overview" },
  ]);

  return <OverviewContent />;
}
