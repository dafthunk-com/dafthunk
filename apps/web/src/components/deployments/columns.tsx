"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, GitCommitHorizontal } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

// Represents a deployed, frozen instance of a workflow
export type Deployment = {
  id: string; // Unique deployment ID
  workflowId: string; // ID of the source workflow
  workflowName: string; // Name of the source workflow
  status: "active" | "failed" | "inactive";
  commitHash: string; // Git commit hash representing the deployed version
  deployedAt: Date;
};

export const columns: ColumnDef<Deployment>[] = [
  {
    accessorKey: "workflowName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Workflow Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const deployment = row.original;
      return (
        <Link
          to={`/workflows/playground/${deployment.workflowId}`}
          className="hover:underline"
        >
          {row.getValue("workflowName")}
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Deployment["status"];
      // Map status to the new badge variants
      const variant: Extract<
        VariantProps<typeof badgeVariants>["variant"],
        "translucent-active" | "translucent-error" | "translucent-inactive"
      > =
        status === "active"
          ? "translucent-active"
          : status === "failed"
            ? "translucent-error"
            : "translucent-inactive";

      return (
        <Badge variant={variant} className="capitalize">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "commitHash",
    header: "Commit Hash",
    cell: ({ row }) => {
      const commitHash = row.getValue("commitHash") as string;
      const shortHash = commitHash.substring(0, 7);
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono flex items-center space-x-1 cursor-default">
              <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />
              <span>{shortHash}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{commitHash}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "deployedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Deployed At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("deployedAt") as Date;
      const formatted = format(date, "PPpp");
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const deployment = row.original;

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
              onClick={() => navigator.clipboard.writeText(deployment.id)}
            >
              Copy Deployment ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(deployment.commitHash)
              }
            >
              Copy Commit Hash
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={`/workflows/playground/${deployment.workflowId}`}>
                View Workflow
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>View Logs</DropdownMenuItem>
            <DropdownMenuItem disabled>Rollback</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              disabled
            >
              Deactivate Deployment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
