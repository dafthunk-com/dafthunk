"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import {
  ExecutionStatusBadge,
  ExecutionStatus,
} from "./execution-status-badge";

// Represents a single run instance of a workflow
export type Execution = {
  id: string; // Unique execution ID
  workflowId: string; // ID of the source workflow
  deploymentId?: string; // Optional: ID of the deployment used
  // workflowName?: string; // Name of the source workflow (not in API)
  status: "running" | "completed" | "failed" | "cancelled";
  // trigger?: string; // e.g., "Manual", "Schedule", "Webhook" (not in API)
  startedAt: Date;
  // endedAt?: Date; // Optional: Only present if not running (not in API)
  duration?: string; // Optional: Calculated duration string
};

// Helper to calculate duration if endedAt exists
function calculateDuration(
  startedAt: Date,
  endedAt?: Date
): string | undefined {
  if (!endedAt) return undefined;
  return formatDistanceToNowStrict(startedAt, {
    unit: "second",
    addSuffix: false, // Remove 'ago'
  });
  // More sophisticated duration formatting can be added here
}

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
    header: "Deployment",
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Started At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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
      // Always show "-" since endedAt is not available from API
      return <div>-</div>;
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
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(execution.id)}
            >
              Copy Execution ID
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/workflows/playground/${execution.workflowId}`}>
                View Workflow
              </Link>
            </DropdownMenuItem>
            {/* No deploymentId or logs available from API */}
            <DropdownMenuSeparator />
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
