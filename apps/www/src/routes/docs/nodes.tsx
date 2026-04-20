import { DocsLayout } from "../../components/docs/docs-layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;
const appUrl = import.meta.env.VITE_APP_URL;

export function meta() {
  const title = "Nodes Reference - Dafthunk Documentation";
  const description =
    "Learn how Dafthunk nodes work: the anatomy of a node, the categories available (AI, text, image, audio, network, data, math), and how to connect them.";
  const url = `${websiteUrl}/docs/nodes`;
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
      name: "Nodes Reference",
      item: `${websiteUrl}/docs/nodes`,
    },
  ],
};

export default function DocsNodes() {
  return (
    <DocsLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1>Nodes Reference</h1>
      <p className="lead">
        In Dafthunk, Nodes are the fundamental units of any workflow. Each node
        represents a specific operation, function, or action. By connecting
        these nodes, you visually design the logic and data flow of your
        automated processes. They are the essential components that make visual
        programming in Dafthunk powerful and intuitive.
      </p>

      <h2 id="explore-nodes">Explore Nodes</h2>
      <p>
        The <a href="/nodes">Nodes catalog</a> on this site is a browsable
        reference of every available node, organized by category. Once you're
        signed in, the <a href={`${appUrl}/playground`}>Playground</a> in the
        app lets you explore the same library interactively — search for
        specific functionality and see detailed information about each node's
        inputs, outputs, and parameters. You can test nodes directly with sample
        data before adding them to your workflows.
      </p>

      <h2 id="node-anatomy">Anatomy of a Node</h2>
      <p>
        Each node in Dafthunk, regardless of its specific function, shares a
        common structure designed for clarity and ease of use. Understanding
        this anatomy is key to effectively building workflows:
      </p>
      <ul>
        <li>
          <strong>Inputs:</strong> Connection points where data or control
          signals enter the node. Nodes can have multiple inputs, each expecting
          a specific type of data.
        </li>
        <li>
          <strong>Outputs:</strong> Connection points from which data or signals
          exit the node after processing. The results of a node's operation are
          passed to other nodes through its outputs.
        </li>
        <li>
          <strong>Parameters:</strong> Configurable settings that allow you to
          customize the behavior of a node. Parameters might include API keys,
          specific values for operations, or choices that dictate how the node
          functions.
        </li>
        <li>
          <strong>Tag:</strong> Nodes are grouped into tags (e.g., AI & ML,
          Text, Data) based on their primary function, making them easier to
          find and understand.
        </li>
        <li>
          <strong>Compatibility:</strong> Information detailing which types of
          workflows or environments support the specific node.
        </li>
      </ul>

      <h2 id="node-categories">Node Categories</h2>
      <p>
        To help you navigate the extensive library, nodes are organized into
        logical categories based on their core functionality:
      </p>
      <ul>
        <li>
          <strong>AI & ML:</strong> Leverage powerful language models, image
          generation capabilities, and other machine learning tools.
        </li>
        <li>
          <strong>Text:</strong> Perform a wide range of text processing tasks,
          including formatting, extraction, and manipulation.
        </li>
        <li>
          <strong>Image:</strong> Tools for image generation, analysis,
          conversion, and transformation.
        </li>
        <li>
          <strong>Audio:</strong> Nodes for speech processing, audio synthesis,
          and other sound-related manipulations.
        </li>
        <li>
          <strong>Network:</strong> Make HTTP requests, scrape web content, and
          integrate with various external APIs and services.
        </li>
        <li>
          <strong>Data:</strong> Process, transform, and manipulate data
          structures like JSON, XML, and CSV.
        </li>
        <li>
          <strong>Math:</strong> Perform mathematical operations, calculations,
          and logical comparisons.
        </li>
        <li>
          <strong>Parameters:</strong> Specialized nodes for handling inputs,
          form data, and workflow arguments.
        </li>
        <li>
          <strong>Email:</strong> Send and process emails, enabling automation
          of communication tasks.
        </li>
        <li>
          <strong>Document:</strong> Tools for processing, converting, and
          extracting data from various document formats.
        </li>
      </ul>

      <h2 id="connecting-nodes">Connecting Nodes</h2>
      <p>
        Workflows come to life by connecting nodes. This process defines how
        data flows and the sequence of operations:
      </p>
      <ol>
        <li>
          <strong>Establish Connections:</strong> Drag from an output port of
          one node to an input port of another. This creates a visual link
          representing the path of data.
        </li>
        <li>
          <strong>Data Transmission:</strong> Once connected, data produced by
          an output port automatically flows to the connected input port of the
          subsequent node.
        </li>
        <li>
          <strong>Type Validation:</strong> The system often performs type
          validation to ensure that the data type of an output is compatible
          with the expected input type, preventing errors.
        </li>
        <li>
          <strong>Execution Order:</strong> The connections form a directed
          graph, which dictates the order in which nodes execute. Dafthunk
          processes nodes based on these dependencies.
        </li>
      </ol>
    </DocsLayout>
  );
}
