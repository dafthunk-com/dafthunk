import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link } from "react-router";
import categories from "../../../data/categories.json";
import allNodes from "../../../data/nodes.json";
import { Layout } from "../../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface NodeData {
  id: string;
  name: string;
  type: string;
  tags: string[];
  icon: string;
  description?: string;
  documentation?: string;
  referenceUrl?: string;
  usage?: number;
  inputs: {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }[];
  outputs: {
    name: string;
    type: string;
    description?: string;
  }[];
}

interface Category {
  id: string;
  name: string;
  summary: string;
  description: string;
  tags: string[];
  nodeIds: string[];
}

const nodesMap = allNodes as Record<string, NodeData>;

export function loader({ params }: LoaderFunctionArgs) {
  const categoryId = params.category;
  if (!categoryId) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Category not specified" }, { status: 400 });
  }

  const category = categories.categories.find(
    (c: Category) => c.id === categoryId
  );
  if (!category) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Category not found" }, { status: 404 });
  }

  const nodes = category.nodeIds
    .map((id: string) => nodesMap[id])
    .filter((n): n is NodeData => n !== undefined);

  return { category, nodes };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Not Found - Dafthunk" }];

  const { category } = data;
  const title = `${category.name} Workflow Nodes - Dafthunk`;
  const description = category.summary;
  const url = `${websiteUrl}/nodes/${category.id}`;

  return [
    { title },
    { name: "description", content: description },
    {
      name: "keywords",
      content: `${category.name}, workflow automation, AI nodes, Dafthunk`,
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

function getIconComponent(iconName: string): LucideIcon {
  const pascalName = iconName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const Icon = (icons as unknown as Record<string, LucideIcon>)[pascalName];
  return Icon || icons.Box;
}

interface LoaderData {
  category: Category;
  nodes: NodeData[];
}

export default function CategoryPage({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { category, nodes } = loaderData;

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
            {category.name} Workflow Nodes
          </h1>
          <p className="text-3xl text-gray-500 mb-6">{category.description}</p>
          <div className="flex flex-wrap gap-2">
            {category.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nodes.map((node) => {
            const IconComponent = getIconComponent(node.icon);
            return (
              <Link
                key={node.id}
                to={`/nodes/${category.id}/${node.id}`}
                className="group block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                      {node.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {node.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {node.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
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

        <div className="mt-32 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-light text-gray-900 mb-4">
            Other Node Categories
          </h2>
          <div className="flex flex-wrap gap-3">
            {categories.categories
              .filter((c: Category) => c.id !== category.id)
              .map((c: Category) => (
                <Link
                  key={c.id}
                  to={`/nodes/${c.id}`}
                  className="px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
