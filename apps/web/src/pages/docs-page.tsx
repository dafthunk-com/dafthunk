import { ArrowRight, BookOpen, Github, Sparkles, Workflow } from "lucide-react";
import { Link } from "react-router";

import { ReadyToBuildBlock } from "@/components/docs/ready-to-build";
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
                  <CardTitle className="text-xl">Core Concepts</CardTitle>
                </div>
                <CardDescription>
                  Understand the fundamental building blocks of Dafthunk.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Workflows: The blueprint for your automation</li>
                  <li>Nodes: Individual tasks and operations</li>
                  <li>Deployments: Runnable versions of your workflows</li>
                  <li>Executions: Single runs of a deployed workflow</li>
                  <li>Organizations: Collaborative spaces for your team</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/concepts">
                    Learn Core Concepts <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-green-500" />
                  <CardTitle className="text-xl">Nodes Reference</CardTitle>
                </div>
                <CardDescription>
                  Comprehensive guide to all available node types and their
                  capabilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Anatomy of a Node: Inputs, outputs, parameters</li>
                  <li>Node Categories: AI & ML, Text, Network, Data, etc.</li>
                  <li>Connecting Nodes: Defining data flow and logic</li>
                  <li>Interactive Node Library browser</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/nodes">
                    Explore Nodes <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="size-5 text-purple-500" />
                  <CardTitle className="text-xl">API Reference</CardTitle>
                </div>
                <CardDescription>
                  Integrate Dafthunk programmatically using our REST API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Authentication with API keys</li>
                  <li>Endpoints for workflow execution</li>
                  <li>Checking execution status and results</li>
                  <li>Retrieving generated objects</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/api">
                    View API Docs <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Github className="size-5 text-orange-500" />
                  <CardTitle className="text-xl">Developers Guide</CardTitle>
                </div>
                <CardDescription>
                  Contribute to Dafthunk or integrate it into your projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Setting up your local development environment</li>
                  <li>How to contribute: Bug reports, features, PRs</li>
                  <li>Overview of the technology stack</li>
                  <li>Project structure and guidelines</li>
                </ul>
                <Button asChild>
                  <Link to="/docs/developers">
                    Read Dev Guide <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <ReadyToBuildBlock />
        </div>
      </div>
    </>
  );
}
