import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import workflowsData from "../../../data/workflows.json";
import { Layout } from "../../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface WorkflowData {
  id: string;
  name: string;
  summary: string;
  description: string;
  metaDescription: string;
  icon: string;
  type: string;
  tags: string[];
  featured: boolean;
}

const { workflows } = workflowsData as { workflows: WorkflowData[] };

export const meta: MetaFunction = () => {
  const title = "Workflow Automation Templates & Use Cases | Dafthunk";
  const description =
    "AI image generation, translation, web scraping, speech-to-text and more. Open source, MIT-licensed workflow templates running serverless on Cloudflare Workers.";
  const url = `${websiteUrl}/workflows`;
  const ogImage = `${websiteUrl}/og-image.webp`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: url },
    { name: "robots", content: "index, follow" },
  ];
};

function getIconComponent(iconName: string): LucideIcon {
  const pascalName = iconName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const Icon = (icons as unknown as Record<string, LucideIcon>)[pascalName];
  return Icon || icons.Box;
}

export default function WorkflowsPage() {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Dafthunk workflow automation templates",
    url: `${websiteUrl}/workflows`,
    description:
      "Open source, MIT-licensed workflow automation templates for AI, browser automation, and data pipelines, running serverless on Cloudflare Workers.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: workflows.map((workflow, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${websiteUrl}/workflows/${workflow.id}`,
        name: workflow.name,
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: websiteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Workflow templates",
        item: `${websiteUrl}/workflows`,
      },
    ],
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="px-6 py-32">
        <Link
          to="/"
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          &larr; Back to Home
        </Link>

        <div className="mb-32">
          <h1 className="text-6xl font-light text-gray-900 mb-6">
            Workflow automation templates
          </h1>
          <p className="text-3xl text-gray-500">
            Ready-made AI, browser, and data automation templates you can run
            serverless on Cloudflare
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => {
            const IconComponent = getIconComponent(workflow.icon);
            return (
              <Link
                key={workflow.id}
                to={`/workflows/${workflow.id}`}
                className="group block bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                      {workflow.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {workflow.summary}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {workflow.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-sm text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
