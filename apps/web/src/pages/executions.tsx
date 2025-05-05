import { useState, useEffect } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import {
  ExecutionStatusBadge,
  ExecutionStatus,
} from "@/components/executions/execution-status-badge";

// Represents a single run instance of a workflow
export type Execution = {
  id: string; // Unique execution ID
  workflowId: string; // ID of the source workflow
  deploymentId?: string; // Optional: ID of the deployment used
  // workflowName?: string; // Name of the source workflow (not in API)
  status: "running" | "completed" | "failed" | "cancelled";
  // trigger?: string; // e.g., "Manual", "Schedule", "Webhook" (not in API)
  startedAt: Date;
  endedAt?: Date;
  duration?: string; // Optional: Calculated duration string
};

export const columns: ColumnDef<Execution>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ExecutionStatus;
      return <ExecutionStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "id",
    header: "Execution ID",
    cell: ({ row }) => {
      const id = row.getValue("id") as string;
      return <span className="font-mono text-xs">{id}</span>;
    },
  },
  {
    accessorKey: "workflowId",
    header: "Workflow ID",
    cell: ({ row }) => {
      const workflowId = row.getValue("workflowId") as string;
      return <span className="font-mono text-xs">{workflowId}</span>;
    },
  },
  {
    accessorKey: "deploymentId",
    header: "Deployment ID",
    enableHiding: false,
    cell: ({ row }) => {
      const deploymentId = row.getValue("deploymentId") as string | undefined;
      return deploymentId && deploymentId !== "N/A" ? (
        <Link
          to={`/deployments/${deploymentId}`}
          className="hover:underline font-mono text-xs"
        >
          {deploymentId}
        </Link>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      );
    },
  },
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ row }) => {
      const date = row.getValue("startedAt") as Date;
      const formatted = format(date, "PPpp");
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const duration = row.getValue("duration") as string | undefined;
      return <div>{duration ?? "-"}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const execution = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(execution.id)}>
              Copy Execution ID
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/workflows/playground/${execution.workflowId}`}>
                View Workflow
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>View Logs</DropdownMenuItem>
            {execution.status === "running" && (
              <DropdownMenuItem disabled>Cancel Execution</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExecutions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/executions`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch executions: ${response.statusText}`);
        }
        const data = await response.json();
        // Map API executions to Execution type expected by DataTable
        const mapped: Execution[] = (data.executions || []).map((exec: any) => {
          const startedAt = exec.startedAt
            ? new Date(exec.startedAt)
            : undefined;
          const endedAt = exec.endedAt ? new Date(exec.endedAt) : undefined;
          const status: Execution["status"] =
            exec.status === "executing"
              ? "running"
              : exec.status === "error"
                ? "failed"
                : exec.status;
          return {
            id: exec.id,
            workflowId: exec.workflowId,
            deploymentId: exec.deploymentId || undefined,
            status,
            startedAt: startedAt || new Date(),
            duration:
              startedAt && endedAt
                ? `${Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)}s`
                : undefined,
            endedAt,
          };
        });
        setExecutions(mapped);
      } catch (err) {
        setError((err as Error).message);
        toast.error("Failed to fetch executions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchExecutions();
  }, []);

  return (
    <TooltipProvider>
      <InsetLayout title="Executions">
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
        </p>
        <DataTable
          columns={columns}
          data={executions}
          isLoading={isLoading}
          emptyState={{
            title: error ? "Error" : "No executions",
            description: error || "No executions found.",
          }}
        />
      </InsetLayout>
    </TooltipProvider>
  );
}
