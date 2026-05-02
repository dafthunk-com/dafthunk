import categories from "../../data/categories.json";
import workflowsData from "../../data/workflows.json";

export function SiteFooter() {
  return (
    <footer className="w-full bg-black text-gray-300 px-6 pt-12 pb-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
        <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-4 max-w-sm">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="Dafthunk"
              className="h-8 w-8 brightness-0 invert"
            />
            <span className="text-2xl font-semibold text-white">dafthunk</span>
          </a>
          <p className="text-base text-gray-400 leading-relaxed">
            Build and deploy serverless workflows by connecting AI models, web
            scraping tools, data transformations, and APIs through a
            drag-and-drop editor. Open source, self-hostable, and running on
            Cloudflare's edge.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Product
          </h3>
          <a href="/" className="text-base hover:text-white">
            Home
          </a>
          <a href="/#features" className="text-base hover:text-white">
            Overview
          </a>
          <a href="/#capabilities" className="text-base hover:text-white">
            Capabilities
          </a>
          <a href="/#use-cases" className="text-base hover:text-white">
            Use Cases
          </a>
          <a href="/#open-source" className="text-base hover:text-white">
            Open Source
          </a>
          <a href="/#faq" className="text-base hover:text-white">
            FAQ
          </a>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Use Cases
          </h3>
          {workflowsData.workflows.map((workflow) => (
            <a
              key={workflow.id}
              href={`/workflows/${workflow.id}`}
              className="text-base hover:text-white"
            >
              {workflow.name}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Capabilities
          </h3>
          {categories.categories.map((category) => (
            <a
              key={category.id}
              href={`/nodes/${category.id}`}
              className="text-base hover:text-white"
            >
              {category.name}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Resources
          </h3>
          <a href="/docs" className="text-base hover:text-white">
            Documentation
          </a>
          <a href="/docs/concepts" className="text-base hover:text-white">
            Core Concepts
          </a>
          <a href="/docs/nodes" className="text-base hover:text-white">
            Nodes Reference
          </a>
          <a href="/docs/api" className="text-base hover:text-white">
            API Reference
          </a>
          <a href="/docs/developers" className="text-base hover:text-white">
            Developers Guide
          </a>
          <a href="/blog" className="text-base hover:text-white">
            Blog
          </a>
          <a
            href="https://github.com/dafthunk-com/dafthunk/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base hover:text-white"
          >
            Support
          </a>
          <a href="/alternatives" className="text-base hover:text-white">
            Alternatives
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 pt-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <p className="text-base text-gray-400">
          © 2025 Dafthunk. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center gap-8">
          <a
            href="https://github.com/dafthunk-com/dafthunk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base hover:text-white"
          >
            GitHub
          </a>
          <a
            href="https://discord.gg/Z6xHWA9sPN"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base hover:text-white"
          >
            Discord
          </a>
          <a href="/terms" className="text-base hover:text-white">
            Terms
          </a>
          <a href="/privacy" className="text-base hover:text-white">
            Privacy
          </a>
          <a href="/cookies" className="text-base hover:text-white">
            Cookie
          </a>
        </nav>
      </div>
    </footer>
  );
}
