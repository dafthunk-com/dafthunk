import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link } from "react-router";
import workflowsData from "../../../data/workflows.json";
import { Layout } from "../../components/layout";
import { WorkflowPreview } from "../../components/workflow-preview";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface WorkflowData {
  id: string;
  name: string;
  summary: string;
  description: string;
  icon: string;
  type: string;
  tags: string[];
}

const { workflows } = workflowsData as { workflows: WorkflowData[] };

export function loader({ params }: LoaderFunctionArgs) {
  const workflowId = params.workflowId;

  if (!workflowId) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Workflow ID not specified" }, { status: 400 });
  }

  const workflow = workflows.find((w) => w.id === workflowId);
  if (!workflow) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Workflow not found" }, { status: 404 });
  }

  const otherWorkflows = workflows.filter((w) => w.id !== workflowId);

  return { workflow, otherWorkflows };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Not Found - Dafthunk" }];

  const { workflow } = data;
  const title = `${workflow.name} - Workflow - Dafthunk`;
  const description =
    workflow.description ||
    `Learn how to automate ${workflow.name} with Dafthunk workflows.`;
  const url = `${websiteUrl}/workflows/${workflow.id}`;
  const keywords = [...workflow.tags, "workflow automation", "Dafthunk"].join(
    ", "
  );

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
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

function getIconComponent(iconName?: string): LucideIcon {
  if (!iconName) return icons.Box;
  const pascalName = iconName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const Icon = (icons as unknown as Record<string, LucideIcon>)[pascalName];
  return Icon || icons.Box;
}

interface LoaderData {
  workflow: WorkflowData;
  otherWorkflows: WorkflowData[];
}

export default function WorkflowPage({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { workflow, otherWorkflows } = loaderData;
  const IconComponent = getIconComponent(workflow.icon);

  return (
    <Layout navigation={navigation}>
      <main className="px-6 py-32">
        <Link
          to="/"
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          &larr; Back to Home
        </Link>

        <div className="mb-12">
          <div className="flex items-start gap-6 mb-6">
            <div className="flex-shrink-0 w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h1 className="text-6xl font-light text-gray-900">
                {workflow.name}
              </h1>
            </div>
          </div>

          <p className="text-3xl text-gray-500 mb-6">{workflow.description}</p>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            {workflow.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <a
            href={import.meta.env.VITE_APP_URL}
            className="inline-block text-lg bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try this workflow
          </a>
        </div>

        {/* Workflow Preview */}
        <section className="mb-12">
          <h2 className="text-2xl font-light text-gray-900 mb-4">
            Workflow Preview
          </h2>
          <WorkflowPreview
            templateId={workflow.id}
            className="h-[40rem] border border-gray-200"
          />
        </section>

        {/* Other Workflows */}
        {otherWorkflows.length > 0 && (
          <section className="mt-32 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-light text-gray-900 mb-6">
              Other Workflows
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherWorkflows.map((other) => {
                const OtherIconComponent = getIconComponent(other.icon);
                return (
                  <Link
                    key={other.id}
                    to={`/workflows/${other.id}`}
                    className="group block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <OtherIconComponent className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-black transition-colors">
                          {other.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {other.summary}
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
