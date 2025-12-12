import { Link, data } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Layout } from "../../components/layout";
import categories from "../../../data/categories.json";
import allNodes from "../../../data/nodes.json";
import * as icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  description: string;
  nodeIds: string[];
}

const nodesMap = allNodes as Record<string, NodeData>;

export async function loader({ params }: LoaderFunctionArgs) {
  const categoryId = params.category;
  const nodeId = params.nodeId;

  if (!categoryId || !nodeId) {
    throw data({ message: "Missing parameters" }, { status: 400 });
  }

  const category = categories.categories.find((c: Category) => c.id === categoryId);
  if (!category) {
    throw data({ message: "Category not found" }, { status: 404 });
  }

  const node = nodesMap[nodeId];
  if (!node || !category.nodeIds.includes(nodeId)) {
    throw data({ message: "Node not found" }, { status: 404 });
  }

  const relatedNodes = category.nodeIds
    .filter((id: string) => id !== nodeId)
    .map((id: string) => nodesMap[id])
    .filter((n): n is NodeData => n !== undefined);

  return { category, node, relatedNodes };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Not Found - Dafthunk" }];

  const { category, node } = data;
  const title = `${node.name} - ${category.name} Workflow Node - Dafthunk`;
  const description = node.description || `Use ${node.name} in your Dafthunk workflow automation.`;
  const url = `https://www.dafthunk.com/nodes/${category.id}/${node.id}`;
  const keywords = [...node.tags, "workflow automation", "Dafthunk"].join(", ");

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
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

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    string: "bg-blue-100 text-blue-700",
    number: "bg-green-100 text-green-700",
    boolean: "bg-yellow-100 text-yellow-700",
    image: "bg-purple-100 text-purple-700",
    audio: "bg-pink-100 text-pink-700",
    json: "bg-orange-100 text-orange-700",
    blob: "bg-gray-100 text-gray-700",
    any: "bg-gray-100 text-gray-600",
  };
  return colors[type] || "bg-gray-100 text-gray-600";
}

interface LoaderData {
  category: Category;
  node: NodeData;
  relatedNodes: NodeData[];
}

export default function NodePage({ loaderData }: { loaderData: LoaderData }) {
  const { category, node, relatedNodes } = loaderData;
  const IconComponent = getIconComponent(node.icon);

  return (
    <Layout navigation={navigation}>
      <main className="px-6 py-32">
        <Link
          to={`/nodes/${category.id}`}
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          &larr; Back to the {category.name} category
        </Link>

        <div className="mb-32">
          <div className="flex items-start gap-6 mb-6">
            <div className="flex-shrink-0 w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h1 className="text-6xl font-light text-gray-900">
                {node.name}
              </h1>
            </div>
          </div>

          {node.description && (
            <p className="text-3xl text-gray-500 mb-6">
              {node.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {node.documentation && (
          <section className="mb-12">
            <h2 className="text-2xl font-light text-gray-900 mb-4">
              Documentation
            </h2>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {node.documentation}
              </p>
            </div>
          </section>
        )}

        {node.inputs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-light text-gray-900 mb-4">Inputs</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Required
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {node.inputs.map((input) => (
                    <tr key={input.name}>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {input.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(input.type)}`}
                        >
                          {input.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {input.required ? (
                          <span className="text-red-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {input.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {node.outputs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-light text-gray-900 mb-4">Outputs</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {node.outputs.map((output) => (
                    <tr key={output.name}>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {output.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(output.type)}`}
                        >
                          {output.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {output.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {node.referenceUrl && (
          <section className="mb-12">
            <h2 className="text-2xl font-light text-gray-900 mb-4">
              Reference
            </h2>
            <a
              href={node.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 underline"
            >
              External Documentation
              <icons.ExternalLink className="w-4 h-4" />
            </a>
          </section>
        )}

        {relatedNodes.length > 0 && (
          <section className="mt-32 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 mb-6">
              Related Nodes in {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {relatedNodes.map((relatedNode) => {
                const RelatedIconComponent = getIconComponent(relatedNode.icon);
                return (
                  <Link
                    key={relatedNode.id}
                    to={`/nodes/${category.id}/${relatedNode.id}`}
                    className="group block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <RelatedIconComponent className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-black transition-colors">
                          {relatedNode.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {relatedNode.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}
