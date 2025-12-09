import type {
  ListExecutionsResponse,
  WorkflowExecution,
} from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Coins from "lucide-react/icons/coins";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import { useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
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

export const createColumns = (
  getOrgUrl: (path: string) => string
): ColumnDef<ListExecutionsResponse["executions"][0]>[] => [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => {
      const workflowName = row.getValue("workflowName") as string;
      const execution = row.original as WorkflowExecution;
      return (
        <Link
          to={getOrgUrl(`executions/${execution.id}`)}
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
    accessorKey: "usage",
    header: "Usage",
    cell: ({ row }) => {
      const usage = row.getValue("usage") as number | undefined;
      return (
        <div className="flex items-center gap-1">
          <Coins className="h-3 w-3 text-muted-foreground" />
          <span>{(usage ?? 0).toLocaleString()}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ row }) => {
      const date = row.getValue("startedAt") as Date | string | undefined;
      if (!date) return <div className="font-medium">-</div>;
      try {
        const formatted = format(new Date(date), "MMM d, yyyy h:mm a");
        return <div className="font-medium">{formatted}</div>;
      } catch {
        return <div className="font-medium">-</div>;
      }
    },
  },
  {
    accessorKey: "endedAt",
    header: "Ended At",
    cell: ({ row }) => {
      const date = row.getValue("endedAt") as Date | string | undefined | null;
      if (!date) return <div className="font-medium">-</div>;
      try {
        const formatted = format(new Date(date), "MMM d, yyyy h:mm a");
        return <div className="font-medium">{formatted}</div>;
      } catch {
        return <div className="font-medium">-</div>;
      }
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
                <Link to={getOrgUrl(`executions/${execution.id}`)}>View</Link>
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
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Monitor the executions of your workflows.
          </div>
        </div>
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
