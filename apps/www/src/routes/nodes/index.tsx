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
  tags: string[];
  nodeIds: string[];
}

const { categories: allCategories } = categories as {
  categories: Category[];
};

export const meta: MetaFunction = () => {
  const title = "Workflow Automation Nodes - Dafthunk";
  const description =
    "Explore all workflow automation nodes available in Dafthunk. From AI models and browser automation to data processing, media generation, integrations, and developer tools.";
  const url = `${websiteUrl}/nodes`;

  return [
    { title },
    { name: "description", content: description },
    {
      name: "keywords",
      content:
        "workflow nodes, automation nodes, AI nodes, integrations, data processing, Dafthunk",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { name: "robots", content: "index, follow" },
  ];
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Overview" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#use-cases", label: "Use Cases" },
  { href: "/#open-source", label: "Open Source" },
  {
    href: "https://github.com/dafthunk-com/dafthunk",
    label: "GitHub",
    external: true,
  },
];

export default function NodesPage() {
  return (
    <Layout navigation={navigation}>
      <main className="px-6 py-32">
        <Link
          to="/"
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          &larr; Back to Home
        </Link>

        <div className="mb-32">
          <h1 className="text-6xl font-light text-gray-900 mb-6">
            Automation capabilities
          </h1>
          <p className="text-3xl text-gray-500">
            Workflow nodes across AI, browser automation, data processing, media,
            and integrations
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
