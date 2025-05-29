import { DocsLayout } from "@/components/layouts/docs-layout";
import TestMdxContent from "@/content/docs/test-mdx.mdx";

export function TestMdxPage() {
  return (
    <DocsLayout
      title="MDX Provider Test"
      description="Testing how MDXProvider styles markdown elements while preserving literal HTML"
      badge="Test"
      navigation={{
        previous: {
          title: "Overview",
          href: "/docs/overview",
        },
        next: {
          title: "Workflows",
          href: "/docs/workflows",
        },
      }}
      tableOfContents={[
        {
          id: "markdown-elements-styled",
          title: "Markdown Elements (Styled)",
          level: 2,
        },
        { id: "lists-in-markdown", title: "Lists in Markdown", level: 3 },
        { id: "code-in-markdown", title: "Code in Markdown", level: 3 },
        { id: "tables-in-markdown", title: "Tables in Markdown", level: 3 },
        {
          id: "literal-html-elements-unstyled",
          title: "Literal HTML Elements (Unstyled)",
          level: 2,
        },
        {
          id: "mixed-content-example",
          title: "Mixed Content Example",
          level: 2,
        },
        { id: "custom-components", title: "Custom Components", level: 2 },
        { id: "external-links", title: "External Links", level: 2 },
      ]}
    >
      <TestMdxContent />
    </DocsLayout>
  );
}
