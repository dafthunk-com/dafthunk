import { Link } from "react-router";
import type { MetaFunction } from "react-router";
import { Layout } from "../../components/layout";
import categories from "../../../data/categories.json";

export const meta: MetaFunction = () => {
  const title = "Workflow Nodes - Dafthunk";
  const description =
    "Explore workflow automation nodes for AI, data processing, integrations, and more. Build powerful workflows with Claude, GPT, Gemini, and 50+ node types.";
  const url = "https://www.dafthunk.com/nodes";

  return [
    { title },
    { name: "description", content: description },
    {
      name: "keywords",
      content:
        "workflow nodes, AI nodes, Claude, GPT, Gemini, workflow automation, Dafthunk",
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

export default function NodesIndex() {
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
            Workflow Nodes
          </h1>
          <p className="text-3xl text-gray-500">
            Explore node categories for building workflow automations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.categories.map((category) => (
            <Link
              key={category.id}
              to={`/nodes/${category.id}`}
              className="group block bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="text-2xl font-medium text-gray-900 mb-3 group-hover:text-black transition-colors">
                {category.name}
              </h2>
              <p className="text-gray-600 mb-4">{category.description}</p>
              <span className="text-sm text-gray-500">
                {category.nodeIds.length} nodes
              </span>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
