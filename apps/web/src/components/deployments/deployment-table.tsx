"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import {
  ArrowUpDown,
  GitCommitHorizontal,
  ArrowUpToLine,
  Eye,
} from "lucide-react";
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

const columns: ColumnDef<DeploymentWithActions>[] = [
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
      const version = deployment.latestVersion
        ? deployment.latestVersion.toString()
        : "1.0";
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="text-xs gap-1">
              <GitCommitHorizontal className="h-3.5 w-3.5" />v{version}
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
      <Badge variant="outline">{row.getValue("deploymentCount")}</Badge>
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
        </div>
      );
    },
  },
];

interface DeploymentTableProps {
  data: DeploymentWithActions[];
  isLoading?: boolean;
  emptyState?: {
    title: string;
    description: string;
  };
}

export function DeploymentTable({
  data,
  isLoading = false,
  emptyState = {
    title: "No results",
    description: "No data available.",
  },
}: DeploymentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Loading...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center py-8">
                  <h3 className="font-semibold text-lg">{emptyState.title}</h3>
                  <p className="text-muted-foreground mt-1">
                    {emptyState.description}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
