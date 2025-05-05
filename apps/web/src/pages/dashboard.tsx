import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/authContext.tsx";
import { workflowService } from "@/services/workflowService";
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

// Mock data - replace with actual data fetching later
const stats = {
  workflows: 12,
  deployments: 5,
  executions: {
    total: 152,
    running: 1,
    failed: 8,
    avgTimeSeconds: 45,
  },
};

function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
}

const now = new Date();
const recentExecutions = [
  {
    id: "exec_ccc333",
    workflowName: "Development Image Processing",
    status: "running",
    startedAt: addSeconds(now, -60), // 1 min ago
  },
  {
    id: "exec_bbb222",
    workflowName: "Staging Daily Report",
    status: "failed",
    startedAt: addSeconds(now, -1800), // 30 mins ago
  },
  {
    id: "exec_aaa111",
    workflowName: "Production Email Campaign",
    status: "completed",
    startedAt: addSeconds(now, -3600), // 1 hour ago
  },
] as const; // Use 'as const' for status typing

export function DashboardPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

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
            <CardTitle className="text-base font-medium">Workflows</CardTitle>
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
            <CardTitle className="text-base font-medium">Deployments</CardTitle>
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
            <CardTitle className="text-base font-medium">Executions</CardTitle>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl">Recent Executions</CardTitle>
          <Button variant="ghost" size="sm" asChild className="-mr-2 h-8">
            <Link to="/workflows/executions" className="text-sm">
              View All
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className="px-6 h-10 text-xs text-muted-foreground">
                  Workflow
                </TableHead>
                <TableHead className="px-6 h-10 text-xs text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-right px-6 h-10 text-xs text-muted-foreground">
                  Started
                </TableHead>
                <TableHead className="w-[50px] px-6 h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExecutions.map((exec) => (
                <TableRow key={exec.id} className="border-t hover:bg-muted/50">
                  <TableCell className="font-medium truncate px-6 py-3">
                    {exec.workflowName}
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <ExecutionStatusBadge status={exec.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground px-6 py-3">
                    {formatDistanceToNow(exec.startedAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right px-6 py-3">
                    <Button variant="ghost" size="icon" className="size-7">
                      <ChevronRight className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
