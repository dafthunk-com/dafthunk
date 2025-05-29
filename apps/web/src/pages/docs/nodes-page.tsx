import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CodeBlock } from "@/components/docs/code-block";
import { NodesBrowser } from "@/components/docs/nodes-browser";
import { Button } from "@/components/ui/button";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsNodesPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Nodes" },
  ]);

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <h2 id="node-browser">Node Browser</h2>
      <p>
        Explore and search through all available nodes with real-time filtering
        by category, name, and description:
      </p>

      <NodesBrowser />

      <hr />

      <h2 id="understanding-nodes">Understanding Nodes</h2>
      <p>
        Every node in Dafthunk represents a specific operation or function that
        can be connected together to create powerful workflows. Nodes are the
        building blocks that make visual programming possible.
      </p>

      <h3>Node Anatomy</h3>
      <p>Each node consists of:</p>
      <ul>
        <li>
          <strong>Inputs</strong> - Data or connections coming into the node
        </li>
        <li>
          <strong>Outputs</strong> - Results or data flowing out of the node
        </li>
        <li>
          <strong>Parameters</strong> - Configuration settings specific to the
          node
        </li>
        <li>
          <strong>Category</strong> - The functional group the node belongs to
        </li>
        <li>
          <strong>Compatibility</strong> - Which workflow types support this
          node
        </li>
      </ul>

      <h3>Node Categories</h3>
      <p>
        Nodes are organized into logical categories based on their primary
        function:
      </p>
      <ul>
        <li>
          <strong>AI & ML</strong> - Language models, image generation, and
          machine learning
        </li>
        <li>
          <strong>Text</strong> - Text processing, formatting, and manipulation
        </li>
        <li>
          <strong>Image</strong> - Image generation, analysis, and
          transformation
        </li>
        <li>
          <strong>Audio</strong> - Speech processing, synthesis, and audio
          manipulation
        </li>
        <li>
          <strong>Network</strong> - HTTP requests, web scraping, and external
          integrations
        </li>
        <li>
          <strong>Data</strong> - JSON, XML, CSV processing and transformation
        </li>
        <li>
          <strong>Math</strong> - Mathematical operations and calculations
        </li>
        <li>
          <strong>Parameters</strong> - Input handling and form data processing
        </li>
        <li>
          <strong>Email</strong> - Email sending and processing capabilities
        </li>
        <li>
          <strong>Document</strong> - Document processing and conversion
        </li>
      </ul>

      <h3>Connecting Nodes</h3>
      <p>Nodes work together by connecting outputs to inputs:</p>
      <ol>
        <li>
          <strong>Drag connections</strong> from output ports to input ports
        </li>
        <li>
          <strong>Data flows</strong> automatically through connected nodes
        </li>
        <li>
          <strong>Type validation</strong> ensures compatible connections
        </li>
        <li>
          <strong>Execution order</strong> is determined by the connection graph
        </li>
      </ol>

      <h3>Best Practices</h3>
      <p>When working with nodes:</p>
      <ul>
        <li>
          <strong>Start Simple</strong> - Begin with basic nodes and add
          complexity gradually
        </li>
        <li>
          <strong>Test Frequently</strong> - Use the playground to verify
          individual node behavior
        </li>
        <li>
          <strong>Handle Errors</strong> - Add error handling nodes for robust
          workflows
        </li>
        <li>
          <strong>Document Purpose</strong> - Use descriptive names for nodes
          and workflows
        </li>
        <li>
          <strong>Optimize Performance</strong> - Consider the computational
          cost of complex nodes
        </li>
      </ul>

      <h2 id="common-patterns">Common Patterns</h2>

      <h3>Sequential Processing</h3>
      <CodeBlock>Input → Transform → Validate → Output</CodeBlock>

      <h3>Parallel Processing</h3>
      <CodeBlock>
        Input → Split → [Process A, Process B] → Merge → Output
      </CodeBlock>

      <h3>Conditional Logic</h3>
      <CodeBlock>
        Input → Condition → [True Path, False Path] → Combine → Output
      </CodeBlock>

      <h3>Data Transformation Pipeline</h3>
      <CodeBlock>Raw Data → Parse → Clean → Transform → Store</CodeBlock>

      <hr />

      <div className="my-8">
        <h2 className="text-xl font-semibold mb-4">Ready to Build?</h2>
        <p className="text-muted-foreground mb-6">
          Start creating workflows with these powerful nodes in the visual
          editor.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/workflows/playground">
              Open Playground <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/workflows">Learn Workflows</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/api">API Reference</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
