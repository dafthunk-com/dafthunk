import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CodeBlock } from "@/components/docs/code-block";
import { Button } from "@/components/ui/button";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsWorkflowsPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Workflows" },
  ]);

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <h2 id="getting-started">Getting Started</h2>

      <h3>Creating Your First Workflow</h3>
      <ol>
        <li>
          Navigate to <strong>Workflows → Playground</strong>
        </li>
        <li>
          Click <strong>"Create Workflow"</strong>
        </li>
        <li>Choose a workflow type</li>
        <li>Give your workflow a name</li>
        <li>Start building with nodes</li>
      </ol>

      <h3>Workflow Editor Interface</h3>
      <p>
        The visual editor provides a canvas where you can drag, drop, and
        connect nodes to build your workflow logic.
      </p>

      <p>
        <strong>Key Features:</strong>
      </p>
      <ul>
        <li>Node palette with 70+ node types</li>
        <li>Drag-and-drop interface</li>
        <li>Real-time parameter configuration</li>
        <li>Connection validation</li>
        <li>Execution preview</li>
      </ul>

      <h2 id="workflow-types">Workflow Types</h2>
      <p>
        Different workflow types determine how and when your workflow is
        executed.
      </p>

      <h3>🖱️ Manual</h3>
      <p>
        <strong>Interactive execution through the web interface</strong>
      </p>
      <ul>
        <li>
          <strong>Best for:</strong> Interactive workflows requiring user input,
          data processing and analysis, testing and development
        </li>
        <li>
          <strong>Features:</strong> Real-time execution feedback, parameter
          input forms, step-by-step debugging
        </li>
      </ul>

      <h3>⚡ HTTP Request</h3>
      <p>
        <strong>Trigger workflows via HTTP API calls</strong>
      </p>
      <ul>
        <li>
          <strong>Best for:</strong> Webhook integrations, API endpoints,
          external system triggers
        </li>
        <li>
          <strong>Features:</strong> Custom HTTP endpoints, JSON/Form data
          support, authentication headers
        </li>
      </ul>

      <h3>📧 Email Message</h3>
      <p>
        <strong>Execute workflows when emails are received</strong>
      </p>
      <ul>
        <li>
          <strong>Best for:</strong> Email processing automation, support ticket
          workflows, notification systems
        </li>
        <li>
          <strong>Features:</strong> Email parsing and extraction, attachment
          processing, conditional routing
        </li>
      </ul>

      <h3>📅 Scheduled</h3>
      <p>
        <strong>Run workflows automatically on a schedule</strong>
      </p>
      <ul>
        <li>
          <strong>Best for:</strong> Regular data synchronization, periodic
          reports and monitoring, automated maintenance tasks
        </li>
        <li>
          <strong>Features:</strong> Cron expression support, timezone
          configuration, execution history tracking
        </li>
      </ul>

      <h2 id="testing-deployment">Testing & Deployment</h2>

      <h3>Testing Workflows</h3>
      <p>
        Test your workflows in the playground environment before deploying to
        production.
      </p>

      <p>
        <strong>Testing Features:</strong>
      </p>
      <ul>
        <li>Real-time execution preview</li>
        <li>Step-by-step debugging</li>
        <li>Input parameter validation</li>
        <li>Output inspection</li>
        <li>Error handling verification</li>
      </ul>

      <h3>Deployment Process</h3>
      <p>
        Deploy your tested workflows to make them available for execution in
        production environments.
      </p>

      <p>
        <strong>Deployment Steps:</strong>
      </p>
      <ol>
        <li>Validate workflow configuration</li>
        <li>Set deployment parameters</li>
        <li>Configure access permissions</li>
        <li>Deploy to production</li>
        <li>Monitor execution status</li>
      </ol>

      <h2>Best Practices</h2>

      <h3>Testing</h3>
      <ul>
        <li>Test with realistic input data</li>
        <li>Verify error handling scenarios</li>
        <li>Check performance with large datasets</li>
        <li>Validate all conditional branches</li>
      </ul>

      <h3>Deployment</h3>
      <ul>
        <li>Use staging environments first</li>
        <li>Monitor initial executions closely</li>
        <li>Set appropriate timeout values</li>
        <li>Configure proper access controls</li>
      </ul>

      <h3>Performance</h3>
      <ul>
        <li>Minimize unnecessary API calls</li>
        <li>Use caching where appropriate</li>
        <li>Handle large datasets efficiently</li>
        <li>Set reasonable timeout values</li>
      </ul>

      <h2>Common Patterns</h2>

      <h3>Data Processing Pipeline</h3>
      <CodeBlock>Input → Validate → Transform → Process → Output</CodeBlock>

      <h3>AI Content Generation</h3>
      <CodeBlock>Prompt → LLM Node → Format → Review → Publish</CodeBlock>

      <h3>API Integration</h3>
      <CodeBlock>HTTP Request → Parse Response → Transform → Store</CodeBlock>

      <h3>Conditional Logic</h3>
      <CodeBlock>
        Input → Condition Check → Branch A / Branch B → Merge
      </CodeBlock>

      <hr />

      <div className="my-8">
        <h2 className="text-xl font-semibold mb-4">Ready to Build?</h2>
        <div className="text-muted-foreground mb-6">
          Start creating your first workflow with our visual editor. Explore the
          playground and experiment with different node combinations.
        </div>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/workflows/playground">
              Open Playground <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/nodes">Explore Nodes</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/api">API Reference</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
