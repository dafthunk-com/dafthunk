import { Layout } from "../components/layout";

export function meta() {
  return [
    {
      title:
        "Dafthunk - Visual Workflow Automation Platform | No-Code Edge Computing",
    },
    {
      name: "description",
      content:
        "Build serverless workflow automation with a drag-and-drop editor. Deploy AI workflows, web scraping, ETL pipelines, and integrations on edge infrastructure.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://dafthunk.com/" },
    {
      property: "og:title",
      content:
        "Dafthunk - Visual Workflow Automation Platform | No-Code Edge Computing",
    },
    {
      property: "og:description",
      content:
        "Build serverless workflow automation with a drag-and-drop editor. Deploy AI workflows, web scraping, ETL pipelines, and integrations on edge infrastructure.",
    },
    { property: "og:image", content: "https://dafthunk.com/og-image.webp" },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: "https://dafthunk.com/" },
    {
      name: "twitter:title",
      content:
        "Dafthunk - Visual Workflow Automation Platform | No-Code Edge Computing",
    },
    {
      name: "twitter:description",
      content:
        "Build serverless workflow automation with a drag-and-drop editor. Deploy AI workflows, web scraping, ETL pipelines, and integrations on edge infrastructure.",
    },
    { name: "twitter:image", content: "https://dafthunk.com/og-image.webp" },
    { tagName: "link", rel: "canonical", href: "https://dafthunk.com/" },
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
              Build serverless workflow automation with a drag-and-drop editor
              that runs on edge infrastructure. Deploy AI workflows, web
              scraping pipelines, data transformations, and API integrations
              globally in seconds, where infrastructure management is someone
              else's problem entirely.
            </p>
            <a
              href={import.meta.env.VITE_APP_URL}
              className="inline-block text-lg bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Automate something
            </a>
          </div>
          <div className="lg:col-span-3 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-xl">
            <iframe
              className="w-full h-full"
              src="https://www.youtube-nocookie.com/embed/5EjJz1Dhtz0?rel=0&modestbranding=1"
              title="Dafthunk Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-32" aria-labelledby="features-heading">
        <div className="mb-32">
          <h2 id="features-heading" className="text-6xl font-light text-gray-900 mb-6">
            Build workflows on edge infrastructure
          </h2>
          <p className="text-3xl text-gray-500">
            Everything you need to build and deploy serverless automation
            workflows
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Visual Workflow Editor
            </h3>
            <p className="text-xl text-gray-600 leading-relaxed">
              A drag-and-drop workflow builder for creating automation workflows
              that makes command-line enthusiasts mildly uncomfortable. Build
              workflow pipelines by connecting nodes visually—no infrastructure
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
              D1 SQL databases and R2 object storage with reasonable confidence
              they'll still be there tomorrow. Durable workflow execution that
              persists even when things go sideways. Because workflows should
              complete, eventually.
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

      <section id="capabilities" className="px-6 py-32" aria-labelledby="capabilities-heading">
        <div className="mb-32">
          <h2 id="capabilities-heading" className="text-6xl font-light text-gray-900 mb-6">
            Workflow automation capabilities
          </h2>
          <p className="text-3xl text-gray-500">
            Workflow nodes across AI, browser automation, data processing,
            media, and integrations
          </p>
        </div>

        <div className="space-y-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                AI & Machine Learning
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Build AI workflow automation integrating Anthropic Claude,
                OpenAI GPT, Google Gemini, and Workers AI for text generation,
                natural language processing, sentiment analysis, and intelligent
                automation. Create AI-powered workflows that leverage large
                language models for content creation, data extraction,
                translation, summarization, and vision AI capabilities. Automate
                complex reasoning tasks and build intelligent agents that
                understand and generate human-like responses.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Claude
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  GPT
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Gemini
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Text generation
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Vision AI
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  NLP
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  LLM
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Browser Automation
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Automate web scraping, data extraction, screenshot capture, and
                PDF generation powered by Browser Rendering at the edge. Extract
                structured data from websites, monitor web pages for changes,
                capture full-page screenshots, convert web pages to PDF
                documents, and interact with dynamic JavaScript-heavy sites.
                Build headless browser automation workflows that run globally
                with low latency and handle complex web scraping tasks at scale.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Web scraping
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Screenshots
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  PDF generation
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Cloudflare
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Headless browser
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Data Processing
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Transform and process data in your workflow automation with
                comprehensive JSON manipulation, CSV parsing and generation,
                text operations, string formatting, and mathematical
                computations. Parse, validate, transform, and merge data from
                multiple sources. Filter, sort, aggregate, and reshape datasets.
                Perform data cleansing, normalization, and enrichment. Build ETL
                workflow pipelines that handle complex data transformations and
                prepare data for analytics, machine learning, or storage.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  JSON
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  CSV
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Text processing
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Math operations
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  ETL
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Media Generation
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Generate and manipulate images, audio files, documents, and 3D
                models in your workflow automation for creative content
                production. Create AI-generated images, edit and transform
                existing images, process and convert audio formats, generate PDF
                documents from templates, and create 3D models programmatically.
                Build automated media workflow pipelines for marketing
                materials, social media content, podcasts, documentation, and
                digital assets at scale.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Image generation
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Audio processing
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  3D models
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Documents
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  PDF
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Integrations
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Connect your workflow automation with popular platforms
                including GitHub for repository management and CI/CD automation,
                Discord for community engagement and bot interactions, LinkedIn
                for professional networking and content publishing, Reddit for
                community monitoring and content posting, Google Calendar for
                event scheduling and meeting automation, and Gmail for email
                management and automated communications. Sync data across
                platforms and build cross-platform workflow integrations.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  GitHub
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Discord
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  LinkedIn
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Reddit
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Google Calendar
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Gmail
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Developer Tools
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Execute custom JavaScript code within your workflow automation,
                make HTTP and REST API requests to any service, work with SQL
                databases and NoSQL data stores, implement conditional logic and
                branching, create loops and iterations, handle errors and
                retries, and build complex workflow orchestration. Integrate
                with any API, transform data programmatically, implement custom
                business logic, and extend workflow automation capabilities with
                code when visual nodes aren't enough.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  JavaScript
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  HTTP/API
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Database
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Logic flows
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  REST API
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="px-6 py-32" aria-labelledby="use-cases-heading">
        <div className="mb-32">
          <h2 id="use-cases-heading" className="text-6xl font-light text-gray-900 mb-6">
            Automation use cases
          </h2>
          <p className="text-3xl text-gray-500">
            What you can build with workflow automation
          </p>
        </div>

        <div className="space-y-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Content Generation & Publishing
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Generate blog posts, social media content, and marketing
                materials using AI models. Automatically publish to multiple
                platforms, create images and media assets, and schedule content
                distribution across channels. Build workflows that combine AI
                text generation with image creation, formatting, and
                multi-platform publishing for complete content automation.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Blog automation
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Social media
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Marketing
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  AI content
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Publishing
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Data Collection & Monitoring
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Scrape websites for product prices, news, or market data.
                Monitor APIs and web pages for changes. Extract structured data
                from documents and PDFs. Build data collection workflows that
                automatically gather information, transform it into structured
                formats, store it in databases, and trigger alerts when patterns
                or changes are detected.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Web scraping
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Price monitoring
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Data extraction
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  ETL pipelines
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Alerts
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-12 xl:col-span-3">
              <h3 className="text-4xl font-light text-gray-900">
                Automation & Integration
              </h3>
            </div>
            <div className="lg:col-span-8 xl:col-span-6">
              <p className="text-xl text-gray-600 leading-relaxed">
                Connect disparate systems and automate business processes. Sync
                data between platforms, trigger actions based on events, process
                webhooks, and orchestrate complex multi-step workflows across
                different services and APIs. Build integration workflows that
                eliminate manual data entry, automate notifications, synchronize
                records, and coordinate actions across your entire tool stack.
              </p>
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  API integration
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Webhooks
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Data sync
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Business process
                </span>
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-base">
                  Orchestration
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="open-source" className="px-6 py-32" aria-labelledby="open-source-heading">
        <div className="mb-32">
          <h2 id="open-source-heading" className="text-6xl font-light text-gray-900 mb-6">
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
              workflow orchestration works. Provided as-is without warranty.
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
