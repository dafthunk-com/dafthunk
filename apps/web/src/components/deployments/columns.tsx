"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, GitCommitHorizontal, ArrowUpToLine, Eye } from "lucide-react";
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
import { WorkflowDeployment } from "@dafthunk/types";

// Represents a deployed, frozen instance of a workflow
export type Deployment = {
  id: string; // Unique deployment ID
  workflowId: string; // ID of the source workflow
  workflowName: string; // Name of the source workflow
  status: "active" | "failed" | "inactive";
  commitHash: string; // Git commit hash representing the deployed version
  deployedAt: Date;
};

export type DeploymentWithActions = WorkflowDeployment & {
  onViewLatest?: (workflowId: string) => void;
  onCreateDeployment?: (workflowId: string) => void;
};

export const columns: ColumnDef<DeploymentWithActions>[] = [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("workflowName")}</div>
    ),
  },
  {
    accessorKey: "workflowId",
    header: "Workflow UUID",
    cell: ({ row }) => {
      const id = row.getValue("workflowId") as string;
      return (
        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {id}
        </code>
      );
    },
  },
  {
    accessorKey: "latestDeploymentId",
    header: "Latest Deployment UUID",
    cell: ({ row }) => {
      const id = row.getValue("latestDeploymentId") as string;
      return (
        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {id}
        </code>
      );
    },
  },
  {
    accessorKey: "deploymentCount",
    header: "Number of Deployments",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.getValue("deploymentCount")}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const deployment = row.original;
      return (
        <div className="flex items-center gap-2">
          <Link to={`/workflows/deployments/${deployment.workflowId}`}>
            <Button size="sm" variant="ghost" className="h-8 px-2">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
          {deployment.onCreateDeployment && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 px-2"
              onClick={() => deployment.onCreateDeployment?.(deployment.workflowId)}
            >
              <ArrowUpToLine className="h-4 w-4 mr-1" />
              Deploy Latest Version
            </Button>
          )}
        </div>
      );
    },
  },
];
