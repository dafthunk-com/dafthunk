import type { WorkflowExecution } from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { usePaginatedExecutions } from "@/services/execution-service";
import { cn } from "@/utils/utils";

export const createColumns = (
  getOrgUrl: (path: string) => string
): ColumnDef<WorkflowExecution>[] => [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => {
      const workflowName = row.getValue("workflowName") as string;
      const execution = row.original as WorkflowExecution;
      return (
        <Link
          to={getOrgUrl(`workflows/executions/${execution.id}`)}
          className="hover:underline"
        >
          {workflowName}
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Execution Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as WorkflowExecution["status"];
      return <ExecutionStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "visibility",
    header: "Visibility",
    cell: ({ row }) => {
      const visibility = row.getValue(
        "visibility"
      ) as WorkflowExecution["visibility"];
      return (
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            visibility === "public"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-gray-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
          )}
        >
          {visibility === "public" ? (
            <Eye className="mr-1 size-3" />
          ) : (
            <EyeOff className="mr-1 size-3" />
          )}
          {visibility}
        </Badge>
      );
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
    accessorKey: "endedAt",
    header: "Ended At",
    cell: ({ row }) => {
      const date = row.getValue("endedAt") as Date | undefined | null;
      const formatted = date ? format(date, "PPpp") : "-";
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const execution = row.original as WorkflowExecution;
      const { startedAt, endedAt } = execution;

      if (startedAt && endedAt) {
        const durationMs =
          new Date(endedAt).getTime() - new Date(startedAt).getTime();
        const seconds = Math.floor((durationMs / 1000) % 60);
        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
        // const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24); // Uncomment if hours are needed

        let formattedDuration = "";
        // if (hours > 0) {
        //   formattedDuration += `${hours}h `;
        // }
        if (minutes > 0) {
          formattedDuration += `${minutes}m `;
        }
        formattedDuration += `${seconds}s`;

        return <div>{formattedDuration.trim()}</div>;
      }
      return <div>-</div>;
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
                <Link to={getOrgUrl(`workflows/executions/${execution.id}`)}>
                  View
                </Link>
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
  const { getOrgUrl } = useOrgUrl();

  const {
    paginatedExecutions,
    executionsError,
    isExecutionsInitialLoading,
    isExecutionsReachingEnd,
    executionsObserverTargetRef,
  } = usePaginatedExecutions();

  // Get error message in a type-safe way
  const errorMessage = executionsError
    ? executionsError instanceof Error
      ? executionsError.message
      : "Unknown error"
    : "";

  useEffect(() => {
    setBreadcrumbs([{ label: "Executions" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (executionsError) {
      toast.error(
        `Failed to fetch executions: ${errorMessage}. Please try again.`
      );
    }
  }, [executionsError, errorMessage]);

  if (isExecutionsInitialLoading) {
    return <InsetLoading title="Executions" />;
  } else if (executionsError) {
    return <InsetError title="Executions" errorMessage={errorMessage} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Executions">
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
        </p>
        <DataTable
          columns={createColumns(getOrgUrl)}
          data={paginatedExecutions}
          emptyState={{
            title: executionsError
              ? "Error"
              : paginatedExecutions.length === 0
                ? "No executions"
                : "No results",
            description: executionsError
              ? errorMessage
              : paginatedExecutions.length === 0
                ? "No executions found."
                : "No executions match your criteria.",
          }}
        />
        {!isExecutionsReachingEnd && !isExecutionsInitialLoading && (
          <div ref={executionsObserverTargetRef} style={{ height: "1px" }} />
        )}
      </InsetLayout>
    </TooltipProvider>
  );
}
