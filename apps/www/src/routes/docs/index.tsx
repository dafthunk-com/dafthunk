import { BookOpen, Code, Github, Sparkles } from "lucide-react";

import { DocsLayout } from "../../components/docs/docs-layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function meta() {
  const title = "Documentation - Dafthunk";
  const description =
    "Explore the Dafthunk documentation: core concepts, nodes reference, REST API, and developers guide for building serverless visual workflows on Cloudflare.";
  const url = `${websiteUrl}/docs`;
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
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: websiteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Documentation",
      item: `${websiteUrl}/docs`,
    },
  ],
};

const cards = [
  {
    href: "/docs/concepts",
    icon: BookOpen,
    title: "Core Concepts",
    description: "Understand the fundamental building blocks of Dafthunk.",
    bullets: [
      "Workflows: blueprints for your automation",
      "Nodes: individual tasks and operations",
      "Executions: single runs of an enabled workflow",
    ],
    cta: "Learn Core Concepts",
    accent: "bg-blue-50 text-blue-700",
  },
  {
    href: "/docs/nodes",
    icon: Sparkles,
    title: "Nodes Reference",
    description: "Comprehensive guide to node types and capabilities.",
    bullets: [
      "Anatomy of a node: inputs, outputs, parameters",
      "Node categories: AI & ML, Text, Network, Data, etc.",
      "Connecting nodes: defining data flow and logic",
    ],
    cta: "Explore Nodes",
    accent: "bg-green-50 text-green-700",
  },
  {
    href: "/docs/api",
    icon: Code,
    title: "API Reference",
    description: "Integrate Dafthunk programmatically using our REST API.",
    bullets: [
      "Authentication with API keys",
      "Endpoints for workflow execution",
      "Retrieving generated objects and results",
    ],
    cta: "View API Docs",
    accent: "bg-purple-50 text-purple-700",
  },
  {
    href: "/docs/developers",
    icon: Github,
    title: "Developers Guide",
    description: "Contribute to Dafthunk or integrate it into your projects.",
    bullets: [
      "Setting up your local development environment",
      "How to contribute: bug reports, features, PRs",
      "Overview of the technology stack",
    ],
    cta: "Read Dev Guide",
    accent: "bg-orange-50 text-orange-700",
  },
];

export default function DocsIndex() {
  return (
    <DocsLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1>Documentation</h1>
      <p className="lead">
        Explore the Dafthunk documentation and learn how to build powerful
        workflow automations.
      </p>

      <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.href}
              href={card.href}
              className="group block bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-medium text-gray-900">
                  {card.title}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{card.description}</p>
              <ul className="space-y-1.5 text-sm text-gray-600 mb-5 list-disc list-inside">
                {card.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <span className="inline-flex items-center text-sm font-medium text-gray-900 group-hover:underline">
                {card.cta} →
              </span>
            </a>
          );
        })}
      </div>

      <div className="not-prose mt-12 rounded-xl bg-white border border-gray-200 p-8 text-center shadow-xs">
        <h2 className="text-2xl font-light text-gray-900 mb-3">
          Ready to build?
        </h2>
        <p className="text-gray-600 mb-6">
          Sign in to Dafthunk and start composing your first workflow.
        </p>
        <a
          href={import.meta.env.VITE_APP_URL}
          className="inline-block text-base bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Open Dafthunk
        </a>
      </div>
    </DocsLayout>
  );
}
