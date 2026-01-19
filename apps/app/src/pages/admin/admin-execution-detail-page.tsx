import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminExecutionDetail } from "@/services/admin-service";

function getStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default";
    case "running":
    case "executing":
      return "secondary";
    case "error":
      return "destructive";
    case "cancelled":
    case "skipped":
      return "outline";
    default:
      return "outline";
  }
}

function formatDate(date: Date | string | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function calculateDuration(startedAt?: Date | string, endedAt?: Date | string) {
  if (!startedAt) return "-";
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function AdminExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("organizationId") || undefined;

  const { execution, executionError, isExecutionLoading } =
    useAdminExecutionDetail(executionId, organizationId);
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Executions", to: "/admin/executions" },
      { label: executionId?.substring(0, 8) || "Execution Details" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, executionId]);

  if (!organizationId) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage="Organization ID is required"
      />
    );
  }

  if (isExecutionLoading) {
    return <InsetLoading title="Execution Details" />;
  }

  if (executionError) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage={executionError.message}
      />
    );
  }

  if (!execution) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage="Execution not found"
      />
    );
  }

  const failedNodes = execution.nodeExecutions.filter(
    (n) => n.status === "error"
  );

  return (
    <InsetLayout title="Execution Details">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{execution.workflowName}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {execution.id}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(execution.status)}>
                {execution.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Organization</div>
                <Link
                  to={`/admin/organizations/${execution.organizationId}`}
                  className="hover:underline text-primary"
                >
                  {execution.organizationName}
                </Link>
              </div>
              <div>
                <div className="text-muted-foreground">Workflow ID</div>
                <div className="font-mono text-xs">{execution.workflowId}</div>
              </div>
              {execution.deploymentId && (
                <div>
                  <div className="text-muted-foreground">Deployment ID</div>
                  <div className="font-mono text-xs">
                    {execution.deploymentId}
                  </div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Usage</div>
                <div>{execution.usage}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
            <CardDescription>Execution timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Started At</div>
                <div>{formatDate(execution.startedAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Ended At</div>
                <div>{formatDate(execution.endedAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div>
                  {calculateDuration(execution.startedAt, execution.endedAt)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Nodes Executed</div>
                <div>{execution.nodeExecutions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {execution.error && (
        <Card className="mt-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Execution Error</CardTitle>
            <CardDescription>
              The workflow execution failed with the following error
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm font-mono whitespace-pre-wrap bg-destructive/10 p-4 rounded-md overflow-x-auto">
              {execution.error}
            </pre>
          </CardContent>
        </Card>
      )}

      {failedNodes.length > 0 && (
        <Card className="mt-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Failed Nodes</CardTitle>
            <CardDescription>
              {failedNodes.length} node{failedNodes.length !== 1 ? "s" : ""}{" "}
              failed during execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {failedNodes.map((node) => (
              <div
                key={node.nodeId}
                className="border border-destructive/30 rounded-md p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm">{node.nodeId}</span>
                  <Badge variant="destructive">{node.status}</Badge>
                </div>
                {node.error && (
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-destructive/10 p-3 rounded-md overflow-x-auto">
                    {node.error}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Node Executions</CardTitle>
          <CardDescription>
            Status of each node in the workflow (
            {execution.nodeExecutions.length} nodes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {execution.nodeExecutions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No node executions recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execution.nodeExecutions.map((node) => (
                  <TableRow key={node.nodeId}>
                    <TableCell className="font-mono text-xs">
                      {node.nodeId}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(node.status)}>
                        {node.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{node.usage}</TableCell>
                    <TableCell className="max-w-md">
                      {node.error ? (
                        <span className="text-destructive text-sm truncate block">
                          {node.error.length > 100
                            ? `${node.error.substring(0, 100)}...`
                            : node.error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </InsetLayout>
  );
}
