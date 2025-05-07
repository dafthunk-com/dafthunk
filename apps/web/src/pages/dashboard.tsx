import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/authContext.tsx";
import { workflowService } from "@/services/workflowService";
import { dashboardService, DashboardStats } from "@/services/dashboardService";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Workflow,
  Target,
  Logs,
  Plus,
  Clock,
  AlertCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { DataTableCard } from "@/components/ui/data-table-card";
import { ColumnDef } from "@tanstack/react-table";

export function DashboardPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardService
      .fetchDashboard()
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard stats"
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateWorkflow = async (name: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      const newWorkflow = await workflowService.create(name);
      navigate(`/workflows/playground/${newWorkflow.id}`);
    } catch {
      // Optionally show a toast here
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        Loading dashboard...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-500">
        {error}
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="flex flex-1 items-center justify-center">
        No dashboard data available.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" /> Create Workflow
        </Button>
        <CreateWorkflowDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateWorkflow={handleCreateWorkflow}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Workflows</CardTitle>
            <Workflow className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.workflows}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Total workflows created
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/workflows/playground">Go to Playground</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Deployments</CardTitle>
            <Target className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.deployments}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Active deployments
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              Latest version: v{stats.deployments > 0 ? 3 : 0}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/workflows/deployments">View Deployments</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Executions</CardTitle>
            <Logs className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.executions.total}</div>
            <div className="text-xs text-muted-foreground pt-1 flex gap-3">
              <div className="flex items-center gap-1">
                <span className="flex size-2 translate-y-px rounded-full bg-blue-500" />
                <span>{stats.executions.running} running</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1">
                  <AlertCircle className="size-3 text-red-500" />
                  {stats.executions.failed} failed
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>Avg. time: {stats.executions.avgTimeSeconds}s</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/workflows/executions">View All Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <DataTableCard
        title="Recent Executions"
        viewAllLink={{
          to: "/workflows/executions",
          text: "View All",
        }}
        columns={[
          {
            accessorKey: "workflowName",
            header: "Workflow",
            cell: ({ row }) => (
              <span className="font-medium truncate">
                {row.original.workflowName}
              </span>
            ),
          },
          {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
              let badgeStatus: "running" | "completed" | "failed" | "cancelled";
              switch (row.original.status) {
                case "executing":
                case "running":
                  badgeStatus = "running";
                  break;
                case "completed":
                  badgeStatus = "completed";
                  break;
                case "error":
                case "failed":
                  badgeStatus = "failed";
                  break;
                case "cancelled":
                  badgeStatus = "cancelled";
                  break;
                default:
                  badgeStatus = "cancelled";
              }
              return <ExecutionStatusBadge status={badgeStatus} />;
            },
          },
          {
            accessorKey: "startedAt",
            header: "Started",
            cell: ({ row }) => (
              <span className="text-right text-xs text-muted-foreground">
                {formatDistanceToNow(row.original.startedAt, {
                  addSuffix: true,
                })}
              </span>
            ),
          },
        ]}
        data={stats.recentExecutions}
        emptyState={{
          title: "No executions",
          description: "There are no recent executions to display.",
        }}
      />
    </div>
  );
}
