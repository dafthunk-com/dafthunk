import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsOverviewPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Overview" },
  ]);

  return (
    <>
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Overview</h1>
          <Badge variant="secondary">v1.0</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Get started with Dafthunk's core concepts and features.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none docs-content">
        <h2 id="core-features">Core Features</h2>

        <h3>🎨 Visual Workflow Editor</h3>
        <p>
          Build workflows using our React Flow-powered visual editor with 70+
          node types.
        </p>
        <ul>
          <li>Drag-and-drop interface</li>
          <li>Real-time execution feedback</li>
          <li>Node connections and data flow</li>
          <li>Workflow versioning and history</li>
        </ul>

        <h3>⚡ AI-Powered Nodes</h3>
        <p>
          Leverage Cloudflare AI for text processing, image generation, and
          audio synthesis.
        </p>
        <ul>
          <li>LLaMA 3.1 & 3.3 language models</li>
          <li>Stable Diffusion image generation</li>
          <li>Whisper speech-to-text</li>
          <li>Sentiment analysis and translation</li>
        </ul>

        <h3>🌍 Edge-Native Architecture</h3>
        <p>
          Built entirely on Cloudflare's global edge network for maximum
          performance.
        </p>
        <ul>
          <li>Cloudflare Workers for serverless execution</li>
          <li>D1 database for persistent storage</li>
          <li>Global edge deployment</li>
          <li>Sub-100ms latency worldwide</li>
        </ul>

        <h3>🛡️ Enterprise Ready</h3>
        <p>Production-ready features for teams and organizations.</p>
        <ul>
          <li>Organization-based access control</li>
          <li>API key management</li>
          <li>Execution monitoring and logs</li>
          <li>Webhook integrations</li>
        </ul>

        <h2 id="quick-start">Quick Start</h2>
        <p>Get started with Dafthunk in just a few steps:</p>
        <ol>
          <li>
            <strong>Learn Workflows</strong> - Understand how to create and
            manage workflows
          </li>
          <li>
            <strong>Explore Nodes</strong> - Discover the 70+ available node
            types
          </li>
          <li>
            <strong>Try the Playground</strong> - Build your first workflow
          </li>
          <li>
            <strong>Deploy & Monitor</strong> - Put your workflows into
            production
          </li>
        </ol>

        <div className="flex flex-wrap gap-4 my-6">
          <Button asChild>
            <Link to="/docs/workflows">
              Learn Workflows <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/nodes">Explore Nodes</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/api">API Reference</Link>
          </Button>
        </div>

        <h2 id="technology-stack">Technology Stack</h2>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Technologies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Frontend</strong>
              </td>
              <td>React 19, TypeScript, TailwindCSS, Shadcn UI</td>
            </tr>
            <tr>
              <td>
                <strong>Backend</strong>
              </td>
              <td>Hono, Cloudflare Workers, D1 Database</td>
            </tr>
            <tr>
              <td>
                <strong>Workflow Engine</strong>
              </td>
              <td>React Flow, Custom Runtime</td>
            </tr>
            <tr>
              <td>
                <strong>AI/ML</strong>
              </td>
              <td>Cloudflare AI, Workers AI</td>
            </tr>
          </tbody>
        </table>

        <h2 id="whats-next">What's Next?</h2>
        <ul>
          <li>
            <Link to="/docs/workflows">Create your first workflow</Link>
          </li>
          <li>
            <Link to="/docs/nodes">Explore available nodes</Link>
          </li>
          <li>
            <Link to="/docs/api">Learn about the API</Link>
          </li>
          <li>
            <Link to="/workflows/playground">Try the playground</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
