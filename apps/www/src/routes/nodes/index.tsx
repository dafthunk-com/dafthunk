import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import categories from "../../../data/categories.json";
import { Layout } from "../../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface Category {
  id: string;
  name: string;
  summary: string;
  description: string;
  metaDescription: string;
  tags: string[];
  nodeIds: string[];
}

const { categories: allCategories } = categories as {
  categories: Category[];
};

export const meta: MetaFunction = () => {
  const title =
    "470+ Workflow Nodes for AI, Browser & Data Automation | Dafthunk";
  const description =
    "470+ visual workflow nodes for AI agents, headless browsers, data pipelines, media, and APIs. Open source, MIT licensed, serverless on Cloudflare Workers.";
  const url = `${websiteUrl}/nodes`;
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

export default function NodesPage() {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Dafthunk workflow automation nodes",
    url: `${websiteUrl}/nodes`,
    description:
      "Open source, MIT-licensed workflow automation nodes for AI, browser automation, data processing, media, and integrations, running serverless on Cloudflare Workers.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: allCategories.map((category, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${websiteUrl}/nodes/${category.id}`,
        name: category.name,
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
        name: "Workflow nodes",
        item: `${websiteUrl}/nodes`,
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
            Workflow automation nodes
          </h1>
          <p className="text-3xl text-gray-500">
            470+ open source nodes for AI, browser automation, data pipelines,
            media, and integrations &mdash; all serverless on Cloudflare
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allCategories.map((category) => (
            <Link
              key={category.id}
              to={`/nodes/${category.id}`}
              className="group block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                  {category.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {category.summary}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {category.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  {category.nodeIds.length} nodes
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
