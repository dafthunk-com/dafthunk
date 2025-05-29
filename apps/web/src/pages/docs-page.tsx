import {
  ArrowRight,
  BookOpen,
  Code,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsPage() {
  usePageBreadcrumbs([{ label: "Documentation" }]);

  return (
    <>
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Explore the Dafthunk documentation and learn how to build powerful
          workflow automations.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none docs-content">
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-blue-500" />
                  <CardTitle className="text-xl">Overview</CardTitle>
                </div>
                <CardDescription>
                  Get started with Dafthunk's core concepts and features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Platform introduction and architecture</li>
                  <li>Key features and capabilities</li>
                  <li>Technology stack overview</li>
                  <li>Quick start guide</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/overview">
                    Get Started <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="size-5 text-green-500" />
                  <CardTitle className="text-xl">Workflows</CardTitle>
                </div>
                <CardDescription>
                  Learn how to create, manage, and execute workflows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Creating your first workflow</li>
                  <li>Workflow types and triggers</li>
                  <li>Testing and deployment</li>
                  <li>Monitoring and management</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/workflows">
                    Learn Workflows <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-purple-500" />
                  <CardTitle className="text-xl">Nodes Reference</CardTitle>
                </div>
                <CardDescription>
                  Comprehensive guide to all 70+ available node types.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>AI and language models</li>
                  <li>Image generation and processing</li>
                  <li>Web scraping and HTTP requests</li>
                  <li>Data processing and math operations</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/nodes">
                    Explore Nodes <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="size-5 text-orange-500" />
                  <CardTitle className="text-xl">API Reference</CardTitle>
                </div>
                <CardDescription>
                  Complete API documentation for programmatic integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Authentication and API keys</li>
                  <li>Workflow execution endpoints</li>
                  <li>Status monitoring and results</li>
                  <li>Code examples and SDKs</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/api">
                    View API Docs <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-secondary p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="size-6" />
              Ready to Build?
            </h2>
            <p className="text-muted-foreground mb-6">
              Jump straight into the action and start building your first
              workflow with our visual editor.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link to="/workflows/playground">
                  Open Playground <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  View Dashboard <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
