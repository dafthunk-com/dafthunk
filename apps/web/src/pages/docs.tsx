import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsPage() {
  // Set a simple breadcrumb for the docs page
  usePageBreadcrumbs([
    { label: "Documentation" }
  ]);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Learn how to use dafthunk to build and manage your workflows
          effectively.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Learn the basics of dafthunk and create your first workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Understanding the dashboard</li>
              <li>Creating a new workflow</li>
              <li>Basic workflow concepts</li>
              <li>Running your first workflow</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/docs">Coming Soon</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Reference</CardTitle>
            <CardDescription>
              Detailed documentation of dafthunk's API and components.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>REST API endpoints</li>
              <li>Authentication</li>
              <li>Webhooks</li>
              <li>SDK documentation</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/docs">Coming Soon</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-secondary p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
        <p className="text-muted-foreground mb-4">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <Button variant="default">Contact Support</Button>
      </div>
    </div>
  );
}
