import { Link } from "react-router";
import categories from "../../data/categories.json";
import workflowsData from "../../data/workflows.json";
import { Layout } from "../components/layout";
import { YouTubeFacade } from "../components/youtube-facade";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function meta() {
  const title =
    "Dafthunk - Open Source Visual Workflow Automation on Cloudflare";
  const description =
    "Open source, serverless visual workflow automation with AI on Cloudflare. Build AI workflows, web scraping, and data pipelines visually. MIT licensed.";
  const ogImage = `${websiteUrl}/og-image.webp`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${websiteUrl}/` },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: `${websiteUrl}/` },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: `${websiteUrl}/` },
  ];
}

const faqs = [
  {
    question: "What is Dafthunk?",
    answer:
      "Dafthunk is an open source visual workflow automation platform. You build workflows by connecting nodes in a React Flow editor, and they run as serverless workflows on Cloudflare Workers and Workflows, with state persisted in D1, R2, and Durable Objects.",
  },
  {
    question: "Is Dafthunk free and open source?",
    answer:
      "Yes. Dafthunk is fully MIT licensed, with no enterprise tier, no fair-code restrictions, and no community edition that hides features. The entire workflow engine, node library, and runtime is on GitHub under the same permissive license.",
  },
  {
    question: "How is Dafthunk different from n8n, Zapier, or Make?",
    answer:
      "Dafthunk is MIT licensed rather than fair-code like n8n, and it runs natively on Cloudflare's serverless platform. Workflows scale to zero when idle and scale up automatically with demand, with no containers or infrastructure to provision. You can self-host it for free or embed it in commercial products.",
  },
  {
    question: "Do I need to manage servers or containers to run Dafthunk?",
    answer:
      "No. Workflows run on Cloudflare Workers and Workflows, so execution is serverless and durable by default. There is nothing to provision or scale. State is persisted in D1 SQL databases, R2 object storage, and Durable Objects, and long-running workflows survive restarts and retries automatically.",
  },
  {
    question: "What kinds of workflows can I build with Dafthunk?",
    answer:
      "You can build AI workflows, web scraping and browser automation, data transformations, API integrations, scheduled cron jobs, webhook handlers, and email pipelines using 470+ nodes across AI models, browsers, data processing, media, and third-party integrations.",
  },
  {
    question: "Can I self-host Dafthunk on my own Cloudflare account?",
    answer:
      "Yes. The full source is on GitHub and deploys to a standard Cloudflare account using Workers, Workflows, D1, R2, and the Workers AI and Analytics Engine bindings. You own your data, your deployment, and your costs.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
};

export default function Home() {
  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="px-6 pt-32 pb-32" aria-label="Hero">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
          <div className="lg:col-span-2 max-w-xl">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 mb-8 text-xs font-medium uppercase tracking-wider text-gray-600 bg-white border border-gray-300 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Open source · MIT · Running on Cloudflare
            </div>
            <h1 className="text-7xl font-light text-gray-900 mb-8 leading-[1.1]">
              Visual workflow
              <br />
              automation on Cloudflare
            </h1>
            <p className="text-2xl text-gray-600 mb-10 leading-relaxed">
              Build workflows visually by connecting artificial intelligence
              (AI) models, browsers, data pipelines and APIs, then deploy them
              on Cloudflare's serverless platform. Workflows scale to zero when
              idle and up with demand, and the entire stack is yours under MIT.
              No enterprise tier, no fair-code carve-outs, no asterisks.
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
        className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] py-24 bg-neutral-100 border-y border-gray-200"
        aria-label="Built on and integrates with"
      >
        <div className="max-w-screen-2xl mx-auto px-6 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-16">
          <p className="text-sm font-mono text-gray-500 uppercase tracking-wider shrink-0">
            Built on · Integrates with
          </p>
          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 lg:ml-auto lg:justify-end">
            {[
              "Cloudflare",
              "Anthropic",
              "OpenAI",
              "Google",
              "GitHub",
              "Discord",
            ].map((name) => (
              <span
                key={name}
                className="text-4xl font-light text-gray-900 leading-none"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="px-6 py-32"
        aria-labelledby="features-heading"
      >
        <div className="mb-32">
          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6">
            01 — Overview
          </p>
          <h2
            id="features-heading"
            className="text-6xl font-light text-gray-900 mb-6"
          >
            Serverless workflows, zero infrastructure
          </h2>
          <p className="text-3xl text-gray-500">
            Scale to zero when idle, to whatever traffic throws at you when it's
            not
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Visual Workflow Editor
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              A React Flow workflow builder for creating automation workflows
              that makes command-line enthusiasts mildly uncomfortable. Build
              workflow pipelines by connecting nodes visually. No infrastructure
              setup, no Docker containers. Just workflows that run on Workers.
            </p>
            <div className="flex flex-wrap gap-2">
              {["React Flow", "Drag & drop", "Live preview", "Versioning"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Durable Workflow Execution
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              Run workflows on Cloudflare Workflows and Workers, where servers
              are merely a philosophical concept. Executions scale to zero when
              idle and up to whatever traffic throws at you, with no
              infrastructure to provision. Durability is built in, so long
              workflows survive restarts and retries.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Cloudflare Workers",
                "Workflows",
                "Durable Objects",
                "Auto-retry",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Persistent Workflow Storage
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              Save workflow state, execution history, and automation data using
              D1 SQL databases, R2 object storage and Workers Analytics Engine
              with reasonable confidence they'll still be there tomorrow.
              Durable workflow execution that persists even when things go
              sideways. Because workflows should complete, eventually.
            </p>
            <div className="flex flex-wrap gap-2">
              {["D1 SQL", "R2 Storage", "Analytics Engine", "KV"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Workflow Triggers & Queues
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              Nothing happens unless something happens. Trigger workflow
              automation via HTTP webhooks for event-driven workflows, Queues
              for reliable message processing, scheduled cron jobs for
              time-based automation, or manual triggers when you feel like it.
              Connect to any REST API, integrate with third-party services, and
              orchestrate complex automation pipelines.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Webhooks", "Queues", "Cron", "Manual", "Email"].map((tag) => (
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
      </section>

      <section
        className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] py-24 bg-neutral-100 border-y border-gray-200"
        aria-label="Platform statistics"
      >
        <div className="max-w-screen-2xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div>
            <p className="text-6xl font-light text-gray-900 mb-3 leading-none">
              470
              <span className="text-3xl text-gray-400 ml-1">+</span>
            </p>
            <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
              Workflow nodes
            </p>
          </div>
          <div>
            <p className="text-6xl font-light text-gray-900 mb-3 leading-none">
              30
              <span className="text-3xl text-gray-400 ml-1">+</span>
            </p>
            <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
              AI models
            </p>
          </div>
          <div>
            <p className="text-6xl font-light text-gray-900 mb-3 leading-none">
              12
              <span className="text-3xl text-gray-400 ml-1">+</span>
            </p>
            <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
              Integrations
            </p>
          </div>
          <div>
            <p className="text-6xl font-light text-gray-900 mb-3 leading-none">
              MIT
            </p>
            <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
              Open source license
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
          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6">
            02 — Use cases
          </p>
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
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 mt-6 transition-colors"
          >
            Browse all workflow templates &rarr;
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
                  <div className="mt-4 flex flex-wrap gap-2">
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
                <div className="lg:col-span-9 xl:col-span-7">
                  <p className="text-xl text-gray-600 leading-relaxed">
                    {workflow.description}
                  </p>
                </div>
                <div className="lg:col-span-3 xl:col-span-2">
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors"
                  >
                    View workflow &rarr;
                  </Link>
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
          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6">
            03 — Capabilities
          </p>
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
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 mt-6 transition-colors"
          >
            Browse all workflow nodes &rarr;
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
                  <div className="mt-4 flex flex-wrap gap-2">
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
                <div className="lg:col-span-9 xl:col-span-7">
                  <p className="text-xl text-gray-600 leading-relaxed">
                    {category.description}
                  </p>
                </div>
                <div className="lg:col-span-3 xl:col-span-2">
                  <Link
                    to={`/nodes/${category.id}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-2 transition-colors"
                  >
                    View {category.nodeIds.length} nodes &rarr;
                  </Link>
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
          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6">
            04 — Open source
          </p>
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
              Fully MIT licensed, with no enterprise tier, no fair-code
              carve-outs, no "community edition" hiding the good parts. Every
              line of the workflow engine, node library and runtime is on GitHub
              under the same permissive license. Fork it, self-host it, embed it
              in a commercial product. Provided as-is without warranty.
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

      <section id="faq" className="px-6 py-32" aria-labelledby="faq-heading">
        <div className="mb-32">
          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6">
            05 — FAQ
          </p>
          <h2
            id="faq-heading"
            className="text-6xl font-light text-gray-900 mb-6"
          >
            Frequently asked questions
          </h2>
          <p className="text-3xl text-gray-500">
            What people ask before they try Dafthunk
          </p>
        </div>

        <div className="space-y-16">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16"
            >
              <div className="lg:col-span-12 xl:col-span-4">
                <h3 className="text-3xl font-light text-gray-900">
                  {faq.question}
                </h3>
              </div>
              <div className="lg:col-span-12 xl:col-span-8">
                <p className="text-xl text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-32" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            id="cta-heading"
            className="text-6xl font-light text-gray-900 mb-8 leading-[1.1]"
          >
            Go automate something
          </h2>
          <p className="text-2xl text-gray-600 mb-10 leading-relaxed">
            Your first workflow takes about four minutes. Your hundredth takes
            about forty seconds. Cloudflare handles the rest.
          </p>
          <a
            href={import.meta.env.VITE_APP_URL}
            className="inline-block text-lg bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Open the editor
          </a>
        </div>
      </section>
    </Layout>
  );
}
