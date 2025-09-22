import { format } from "date-fns";
import {
  AlertCircle,
  Clock,
  Logs,
  MoreHorizontal,
  Target,
  Workflow,
} from "lucide-react";
import { Link } from "react-router";

import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkflowExecutionStatus } from "@/components/workflow/workflow-types";
import { useDashboard } from "@/services/dashboard-service";

// Define a type for recent execution items, mirroring DashboardStats.recentExecutions
interface RecentExecutionItem {
  id: string;
  workflowName: string;
  status: string;
  startedAt: number;
  endedAt?: number;
}

export function DashboardPage() {
  const { dashboardStats, dashboardStatsError, isDashboardStatsLoading } =
    useDashboard();

  if (isDashboardStatsLoading) {
    return <InsetLoading title="Dashboard" />;
  } else if (dashboardStatsError) {
    return (
      <InsetError
        title="Dashboard"
        errorMessage={dashboardStatsError.message}
      />
    );
  }

  if (!dashboardStats) {
    return (
      <InsetLayout title="Dashboard">
        <div className="flex flex-1 items-center justify-center">
          No dashboard data available.
        </div>
      </InsetLayout>
    );
  }

  return (
    <InsetLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Workflows</CardTitle>
            <Workflow className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardStats.workflows}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Total workflows created
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/org/workflows">Go to Workflows</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Deployments</CardTitle>
            <Target className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {dashboardStats.deployments}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Active deployments
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/org/deployments">View Deployments</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Executions</CardTitle>
            <Logs className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {dashboardStats.executions.total}
            </div>
            <div className="text-xs text-muted-foreground pt-1 flex gap-3">
              <div className="flex items-center gap-1">
                <span className="flex size-2 translate-y-px rounded-full bg-blue-500" />
                <span>{dashboardStats.executions.running} running</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1">
                  <AlertCircle className="size-3 text-red-500" />
                  {dashboardStats.executions.failed} failed
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>
                  Avg. time: {dashboardStats.executions.avgTimeSeconds}s
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/org/executions">View All Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <DataTableCard
        title="Recent Executions"
        viewAllLink={{
          to: "/org/executions",
          text: "View All",
        }}
        columns={[
          {
            accessorKey: "workflowName",
            header: "Workflow",
            cell: ({ row }) => {
              const execution = row.original as RecentExecutionItem;
              return (
                <Link
                  to={`/workflows/executions/${execution.id}`}
                  className="font-medium truncate hover:underline text-primary"
                >
                  {execution.workflowName}
                </Link>
              );
            },
          },
          {
            accessorKey: "status",
            header: "Execution Status",
            cell: ({ row }) => {
              const execution = row.original as RecentExecutionItem;
              const badgeStatus = execution.status as WorkflowExecutionStatus;
              return <ExecutionStatusBadge status={badgeStatus} />;
            },
          },
          {
            accessorKey: "startedAt",
            header: "Started At",
            cell: ({ row }) => {
              const execution = row.original as RecentExecutionItem;
              return (
                <span className="text-xs text-muted-foreground">
                  {execution.startedAt
                    ? format(new Date(execution.startedAt), "PPpp")
                    : "-"}
                </span>
              );
            },
          },
          {
            accessorKey: "endedAt",
            header: "Ended At",
            cell: ({ row }) => {
              const execution = row.original as RecentExecutionItem;
              const formatted = execution.endedAt
                ? format(new Date(execution.endedAt), "PPpp")
                : "-";
              return (
                <span className="text-xs text-muted-foreground">
                  {formatted}
                </span>
              );
            },
          },
          {
            accessorKey: "duration",
            header: "Duration",
            cell: ({ row }) => {
              const execution = row.original as RecentExecutionItem;
              const { startedAt, endedAt } = execution;

              if (startedAt && endedAt) {
                const durationMs =
                  new Date(endedAt).getTime() - new Date(startedAt).getTime();
                const seconds = Math.floor((durationMs / 1000) % 60);
                const minutes = Math.floor((durationMs / (1000 * 60)) % 60);

                let formattedDuration = "";
                if (minutes > 0) {
                  formattedDuration += `${minutes}m `;
                }
                formattedDuration += `${seconds}s`;
                if (
                  formattedDuration.trim() === "0s" &&
                  durationMs > 0 &&
                  durationMs < 1000
                ) {
                  formattedDuration = "<1s";
                } else if (
                  formattedDuration.trim() === "0s" &&
                  durationMs === 0
                ) {
                  formattedDuration = "0s";
                }

                return <div>{formattedDuration.trim()}</div>;
              }
              return <div>-</div>;
            },
          },
          {
            id: "actions",
            cell: ({ row }) => {
              const execution = row.original as RecentExecutionItem;
              return (
                <div className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/workflows/executions/${execution.id}`}>
                          View
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            },
          },
        ]}
        data={dashboardStats.recentExecutions as RecentExecutionItem[]}
        emptyState={{
          title: "No executions",
          description: "There are no recent executions to display.",
        }}
      />
    </InsetLayout>
  );
}
