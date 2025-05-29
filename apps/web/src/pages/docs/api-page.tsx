import ApiContent from "@/content/docs/api.mdx";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsApiPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "API" },
  ]);

  return <ApiContent />;
}
