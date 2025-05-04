"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, GitCommitHorizontal, ArrowUpToLine, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 font-medium"
        >
          Workflow Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("workflowName")}</div>
    ),
  },
  {
    accessorKey: "latestVersion",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 font-medium"
        >
          Latest Deployment Version
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const deployment = row.original;
      // Convert to string and default to 1.0.0 if not available
      const version = deployment.latestVersion ? deployment.latestVersion.toString() : "1.0";
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="text-xs gap-1">
              <GitCommitHorizontal className="h-3.5 w-3.5" />
              v{version}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Latest deployment ID: {deployment.latestDeploymentId}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "deploymentCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 font-medium"
        >
          Number of Deployments
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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
