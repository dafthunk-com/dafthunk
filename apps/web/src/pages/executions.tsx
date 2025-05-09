import { useEffect } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
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
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useExecutions } from "@/hooks/use-fetch";
import { toast } from "sonner";

// Represents a single run instance of a workflow
export type Execution = {
  id: string; // Unique execution ID
  workflowId: string; // ID of the source workflow
  workflowName: string; // Name of the source workflow
  deploymentId?: string; // Optional: ID of the deployment used
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  endedAt?: Date;
  duration?: string; // Optional: Calculated duration string
};

export const columns: ColumnDef<Execution>[] = [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => {
      const workflowName = row.getValue("workflowName") as string;
      const execution = row.original as Execution;
      return (
        <Link
          to={`/workflows/playground/${execution.workflowId}`}
          className="hover:underline"
        >
          {workflowName}
        </Link>
      );
    },
  },
  {
    accessorKey: "workflowId",
    header: "Workflow UUID",
    cell: ({ row }) => {
      const workflowId = row.getValue("workflowId") as string;
      return (
        <Link
          to={`/workflows/playground/${workflowId}`}
          className="font-mono text-xs hover:underline"
        >
          {workflowId}
        </Link>
      );
    },
  },
  {
    accessorKey: "deploymentId",
    header: "Deployment UUID",
    enableHiding: false,
    cell: ({ row }) => {
      const deploymentId = row.getValue("deploymentId") as string | undefined;
      return deploymentId && deploymentId !== "N/A" ? (
        <Link
          to={`/workflows/deployments/version/${deploymentId}`}
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
    accessorKey: "id",
    header: "Execution UUID",
    cell: ({ row }) => {
      const id = row.getValue("id") as string;
      return (
        <Link
          to={`/workflows/executions/${id}`}
          className="font-mono text-xs hover:underline"
        >
          {id}
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Execution Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ExecutionStatus;
      return <ExecutionStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ row }) => {
      const date = row.getValue("startedAt") as Date;
      const formatted = date ? format(date, "PPpp") : "Loading...";
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
                <Link to={`/workflows/executions/${execution.id}`}>View</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function ExecutionsPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { executions, executionsError, isExecutionsLoading } = useExecutions();

  useEffect(() => {
    setBreadcrumbs([{ label: "Executions" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (executionsError) {
      toast.error(
        `Failed to fetch executions: ${executionsError.message}. Please try again.`
      );
    }
  }, [executionsError]);

  if (isExecutionsLoading && !executions) {
    return (
      <InsetLayout title="Executions">
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
        </p>
        <p>Loading executions...</p>
      </InsetLayout>
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Executions">
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
        </p>
        <DataTable
          columns={columns}
          data={executions || []}
          emptyState={{
            title: executionsError ? "Error" : "No executions",
            description: executionsError?.message || "No executions found.",
          }}
        />
      </InsetLayout>
    </TooltipProvider>
  );
}
