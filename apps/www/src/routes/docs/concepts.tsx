import { DocsLayout } from "../../components/docs/docs-layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function meta() {
  const title = "Core Concepts - Dafthunk Documentation";
  const description =
    "Learn the building blocks of Dafthunk: workflows, nodes, executions, triggers, resources, and organizations — and how they fit together to automate work.";
  const url = `${websiteUrl}/docs/concepts`;
  const ogImage = `${websiteUrl}/og-image.webp`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "article" },
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
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: websiteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Documentation",
      item: `${websiteUrl}/docs`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Core Concepts",
      item: `${websiteUrl}/docs/concepts`,
    },
  ],
};

export default function DocsConcepts() {
  return (
    <DocsLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1>Core Concepts</h1>
      <p className="lead">
        Dafthunk is a platform for creating, executing, and monitoring visual
        workflows. It enables you to automate complex tasks by connecting
        different processing units, called nodes, in a drag-and-drop interface.
        Built on Cloudflare, Dafthunk leverages serverless functions for
        scalable execution and AI capabilities for intelligent processing.
      </p>

      <h2 id="workflows">Workflows</h2>
      <p>
        A <strong>Workflow</strong> is the blueprint for your automation. It's a
        visual representation of a series of steps, defined by connecting nodes
        together. Each workflow is saved within your organization and can be
        versioned and updated as your needs evolve. Think of it as the overall
        process you want to automate, like processing new user sign-ups or
        handling customer support tickets.
      </p>

      <h2 id="nodes">Nodes</h2>
      <p>
        <strong>Nodes</strong> are the individual building blocks of a workflow.
        Each node performs a specific task, such as making an HTTP request,
        running an AI model for text analysis, transforming data, or making a
        decision based on input. You connect nodes by their inputs and outputs
        to define the flow of data and logic.
      </p>

      <h2 id="executions">Executions</h2>
      <p>
        An <strong>Execution</strong> is a single run of a workflow. Every time
        your workflow is triggered, an execution record is created. This record
        tracks the status of the run (e.g., <code>submitted</code>,{" "}
        <code>executing</code>, <code>completed</code>, or <code>error</code>),
        its inputs, outputs, and any logs. Executions are crucial for
        monitoring, debugging, and understanding how your workflows are
        performing.
      </p>

      <h2 id="triggers">Triggers</h2>
      <p>
        <strong>Triggers</strong> define how workflows are started. A workflow
        can have one or more triggers that initiate execution when a specific
        event occurs. Dafthunk supports several trigger types:
      </p>
      <ul>
        <li>
          <strong>Endpoints:</strong> HTTP endpoints that start workflows when
          they receive a request. Create endpoints under{" "}
          <strong>Endpoints</strong> and connect them to workflows via triggers.
          Endpoints support both webhook (fire-and-forget) and request
          (synchronous response) modes.
        </li>
        <li>
          <strong>Queues:</strong> Message queues that trigger workflows when a
          message is published. Useful for decoupling producers from consumers
          and handling asynchronous workloads.
        </li>
        <li>
          <strong>Emails:</strong> Email addresses that trigger workflows when a
          message is received, enabling email-driven automation.
        </li>
        <li>
          <strong>Schedules:</strong> Cron-based schedules that trigger
          workflows at regular intervals.
        </li>
        <li>
          <strong>Bots:</strong> Discord and Telegram bots that trigger
          workflows from chat messages.
        </li>
      </ul>

      <h2 id="resources">Resources</h2>
      <p>
        <strong>Resources</strong> are shared assets that workflows can use
        during execution:
      </p>
      <ul>
        <li>
          <strong>Schemas:</strong> Reusable definitions that describe the shape
          of records used in your workflows. Each schema has a name,
          description, and a set of typed fields. Use schemas to validate and
          enforce consistent data structures across nodes, ensuring that inputs
          and outputs conform to expected formats.
        </li>
        <li>
          <strong>Databases:</strong> Managed SQLite databases for storing and
          querying structured data. Workflows can read from and write to
          databases using SQL nodes, and you can query them directly via the
          API.
        </li>
        <li>
          <strong>Datasets:</strong> Collections of documents for
          Retrieval-Augmented Generation (RAG). Upload files to a dataset and
          use RAG nodes to search and retrieve relevant content within your
          workflows.
        </li>
        <li>
          <strong>Secrets:</strong> Securely stored credentials and API keys
          that nodes can access at runtime (e.g., third-party API tokens).
          Secrets are encrypted and never exposed in workflow definitions or
          logs.
        </li>
        <li>
          <strong>Integrations:</strong> OAuth connections to third-party
          services (e.g., Google, Slack, GitHub). Once configured, integration
          nodes can use these connections to interact with external APIs on your
          behalf.
        </li>
      </ul>

      <h2 id="organizations">Organizations</h2>
      <p>
        Dafthunk is designed for collaboration. <strong>Organizations</strong>{" "}
        serve as containers for your workflows, triggers, resources, and
        executions. <strong>Users</strong> belong to organizations and can
        collaborate on building and managing workflows based on their roles and
        permissions.
      </p>

      <h2 id="practical-example">Practical Example</h2>
      <p>
        Let's illustrate with an example: generating an image from text and
        saving it.
      </p>
      <ol>
        <li>
          <strong>Design a Workflow</strong>: In your Dafthunk organization, you
          create a new <code>Workflow</code>. You connect the following nodes:
          <ul>
            <li>
              A "Parameter" node to accept a text prompt, for example, "a
              futuristic cityscape at sunset."
            </li>
            <li>
              An "Image Generation" AI node, which takes the text prompt as
              input and produces an image.
            </li>
            <li>
              An "HTTP Request" node configured to send the generated image to
              an external storage service or your own server for saving.
            </li>
          </ul>
        </li>
        <li>
          <strong>Set Up a Trigger</strong>: Create an <strong>Endpoint</strong>{" "}
          and add a trigger to your workflow that connects it to the endpoint.
          Enable the workflow to make it active.
        </li>
        <li>
          <strong>Trigger and Execute</strong>: You (or an external system) send
          a POST request containing the text prompt to the endpoint. This starts
          an <code>Execution</code>.
        </li>
        <li>
          <strong>Monitor the Result</strong>: In Dafthunk, you can observe the{" "}
          <code>Execution</code>. You'll see the input prompt, the successful
          generation of the image by the AI node, and the confirmation that the
          HTTP request node successfully sent the image data to your specified
          storage location. If any step failed, the execution status would
          indicate an error, allowing you to investigate.
        </li>
      </ol>
      <p>
        This example shows how Dafthunk can orchestrate standard web tasks, all
        visually configured and monitored through <code>Workflows</code>,{" "}
        <code>Triggers</code>, and <code>Executions</code>.
      </p>
    </DocsLayout>
  );
}
