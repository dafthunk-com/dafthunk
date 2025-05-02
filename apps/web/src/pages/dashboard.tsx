import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow, Target, Logs, Plus, Clock, AlertCircle } from "lucide-react";
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

// Helper to add seconds to a date for mock data (copied from executions.tsx)
function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
}

// Mock data for recent executions (derived from executions.tsx mock)
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
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <Button asChild size="sm">
          <Link to="/workflows/playground">
            <Plus className="mr-2 size-4" /> Create Workflow
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
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
              className="mt-2 text-xs h-8"
              asChild
            >
              <Link to="/workflows/playground">Go to Playground</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployments</CardTitle>
            <Target className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.deployments}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Active deployments
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs h-8"
              asChild
            >
              <Link to="/workflows/deployments">View Deployments</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions</CardTitle>
            <Logs className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.executions.total}</div>
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
              <span className="flex size-2 translate-y-px rounded-full bg-blue-500" />
              <span>{stats.executions.running} running</span>
              <span className="text-destructive flex items-center gap-0.5 ml-2">
                <AlertCircle className="size-3" />
                {stats.executions.failed} failed
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="size-3" /> Avg. time:{" "}
              {stats.executions.avgTimeSeconds}s
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs h-8"
              asChild
            >
              <Link to="/workflows/executions">View All Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className="text-xs text-muted-foreground h-8">
                  Workflow
                </TableHead>
                <TableHead className="text-xs text-muted-foreground h-8">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs text-muted-foreground h-8">
                  Started
                </TableHead>
                <TableHead className="w-[20px] h-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExecutions.map((exec) => (
                <TableRow key={exec.id} className="border-t">
                  <TableCell className="font-medium truncate py-2.5">
                    {exec.workflowName}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <ExecutionStatusBadge status={exec.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                    {formatDistanceToNow(exec.startedAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right py-2.5"></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
