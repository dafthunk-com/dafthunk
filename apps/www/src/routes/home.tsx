import { Link } from "react-router";
import categories from "../../data/categories.json";
import workflowsData from "../../data/workflows.json";
import { Layout } from "../components/layout";
import { YouTubeFacade } from "../components/youtube-facade";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function meta() {
  return [
    {
      title: "Dafthunk - Visual Workflow Automation Platform",
    },
    {
      name: "description",
      content:
        "Build serverless workflow automation with a React Flow editor. Deploy AI workflows, web scraping pipelines, data transformations, and integrations on Cloudflare's edge infrastructure.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${websiteUrl}/` },
    {
      property: "og:title",
      content: "Dafthunk - Visual Workflow Automation Platform",
    },
    {
      property: "og:description",
      content:
        "Build serverless workflow automation with a React Flow editor. Deploy AI workflows, web scraping pipelines, data transformations, and integrations on Cloudflare's edge infrastructure.",
    },
    { property: "og:image", content: `${websiteUrl}/og-image.webp` },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: `${websiteUrl}/` },
    {
      name: "twitter:title",
      content: "Dafthunk - Visual Workflow Automation Platform",
    },
    {
      name: "twitter:description",
      content:
        "Build serverless workflow automation with a React Flow editor. Deploy AI workflows, web scraping pipelines, data transformations, and integrations on Cloudflare's edge infrastructure.",
    },
    {
      name: "twitter:image",
      content: `${websiteUrl}/og-image.webp`,
    },
    { tagName: "link", rel: "canonical", href: `${websiteUrl}/` },
  ];
}

const navigation = [
  { href: "/", label: "Home" },
  { href: "#features", label: "Overview" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "#open-source", label: "Open Source" },
  {
    href: "https://github.com/dafthunk-com/dafthunk",
    label: "GitHub",
    external: true,
  },
];

export default function Home() {
  return (
    <Layout navigation={navigation}>
      <section className="px-6 pt-32 pb-32" aria-label="Hero">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
          <div className="lg:col-span-2 max-w-xl">
            <h1 className="text-7xl font-light text-gray-900 mb-8 leading-[1.1]">
              Visual workflow
              <br />
              automation
            </h1>
            <p className="text-2xl text-gray-600 mb-10 leading-relaxed">
              Dafthunk is a visual workflow automation platform. Build and
              deploy serverless workflows by connecting AI models, web scraping
              tools, data transformations, and APIs through a drag-and-drop
              editor. Your workflows run on Cloudflare's global edge network
              with built-in durability and scaling. Open source and
              self-hostable.
            </p>
            <a
              href={import.meta.env.VITE_APP_URL}
              className="inline-block text-lg bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Automate something
            </a>
            <p className="mt-6 text-sm text-gray-500">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-gray-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-gray-700">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="lg:col-span-3 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-xl">
            <YouTubeFacade videoId="5EjJz1Dhtz0" title="Dafthunk Demo" />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="px-6 py-32"
        aria-labelledby="features-heading"
      >
        <div className="mb-32">
          <h2
            id="features-heading"
            className="text-6xl font-light text-gray-900 mb-6"
          >
            Prototype workflows on edge infrastructure
          </h2>
          <p className="text-3xl text-gray-500">
            Everything you need to build and deploy automation workflows on
            Cloudflare
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Visual Workflow Editor
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              A React Flow workflow builder for creating automation workflows
              that makes command-line enthusiasts mildly uncomfortable. Build
              workflow pipelines by connecting nodes visually. No infrastructure
              setup, no Docker containers. Just workflows that run on Workers.
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Durable Workflow Execution
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              Run automation workflows using Cloudflare Workflows and Workers
              across the edge network, where servers are merely a philosophical
              concept. Your workflows execute everywhere and nowhere
              simultaneously with built-in durability. The infrastructure
              handles scaling, you handle the logic.
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Persistent Workflow Storage
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              Save workflow state, execution history, and automation data using
              D1 SQL databases, R2 object storage and Workers Analytics Engine
              with reasonable confidence they'll still be there tomorrow.
              Durable workflow execution that persists even when things go
              sideways. Because workflows should complete, eventually.
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Workflow Triggers & Queues
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              Nothing happens unless something happens. Trigger workflow
              automation via HTTP webhooks for event-driven workflows, Queues
              for reliable message processing, scheduled cron jobs for
              time-based automation, or manual triggers when you feel like it.
              Connect to any REST API, integrate with third-party services, and
              orchestrate complex automation pipelines.
            </p>
          </div>
        </div>
      </section>

      <section
        id="use-cases"
        className="px-6 py-32"
        aria-labelledby="use-cases-heading"
      >
        <div className="mb-32">
          <h2
            id="use-cases-heading"
            className="text-6xl font-light text-gray-900 mb-6"
          >
            Automation use cases
          </h2>
          <p className="text-3xl text-gray-500">
            What you can build with workflow automation
          </p>
          <Link
            to="/workflows"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 mt-6 transition-colors"
          >
            View all use cases &rarr;
          </Link>
        </div>

        <div className="space-y-24">
          {workflowsData.workflows
            .filter((workflow) => workflow.featured)
            .map((workflow) => (
              <div
                key={workflow.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16"
              >
                <div className="lg:col-span-12 xl:col-span-3">
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="text-4xl font-light text-gray-900 hover:text-black transition-colors"
                  >
                    {workflow.name}
                  </Link>
                </div>
                <div className="lg:col-span-8 xl:col-span-6">
                  <p className="text-xl text-gray-600 leading-relaxed mb-4">
                    {workflow.description}
                  </p>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors"
                  >
                    View workflow &rarr;
                  </Link>
                </div>
                <div className="lg:col-span-4 xl:col-span-3">
                  <div className="flex flex-wrap gap-2">
                    {workflow.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section
        id="capabilities"
        className="px-6 py-32"
        aria-labelledby="capabilities-heading"
      >
        <div className="mb-32">
          <h2
            id="capabilities-heading"
            className="text-6xl font-light text-gray-900 mb-6"
          >
            Automation capabilities
          </h2>
          <p className="text-3xl text-gray-500">
            Workflow nodes across AI, browser automation, data processing,
            media, and integrations
          </p>
          <Link
            to="/nodes"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 mt-6 transition-colors"
          >
            View all categories &rarr;
          </Link>
        </div>

        <div className="space-y-24">
          {categories.categories
            .filter((category) => category.featured)
            .map((category) => (
              <div
                key={category.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16"
              >
                <div className="lg:col-span-12 xl:col-span-3">
                  <Link
                    to={`/nodes/${category.id}`}
                    className="text-4xl font-light text-gray-900 hover:text-black transition-colors"
                  >
                    {category.name}
                  </Link>
                </div>
                <div className="lg:col-span-8 xl:col-span-6">
                  <p className="text-xl text-gray-600 leading-relaxed mb-4">
                    {category.description}
                  </p>
                  <Link
                    to={`/nodes/${category.id}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors"
                  >
                    View {category.nodeIds.length} nodes &rarr;
                  </Link>
                </div>
                <div className="lg:col-span-4 xl:col-span-3">
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section
        id="open-source"
        className="px-6 py-32"
        aria-labelledby="open-source-heading"
      >
        <div className="mb-32">
          <h2
            id="open-source-heading"
            className="text-6xl font-light text-gray-900 mb-6"
          >
            Open source workflow platform
          </h2>
          <p className="text-3xl text-gray-500">
            MIT licensed and developed in public
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Open Source & Self-Hosted
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              MIT licensed workflow automation software with all code available
              on GitHub. Fork it, self-host the workflow engine on your own
              infrastructure, extend the node library with custom workflow
              nodes, or read the source code to understand how serverless
              workflow orchestration works on Cloudflare. Provided as-is without
              warranty.
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Built to Learn AI-Assisted Coding
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              We started this project to explore AI-assisted development and
              better understand its capabilities and limits. Development happens
              in public on GitHub. Contribute custom workflow nodes, report
              bugs, request features, or observe how we're building serverless
              workflow automation infrastructure with AI assistance.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
