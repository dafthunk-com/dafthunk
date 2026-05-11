import type { ExecutionStatusType } from "@dafthunk/types";
import {
  type ListExecutionsResponse,
  WorkflowExecution,
} from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import CalendarIcon from "lucide-react/icons/calendar";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  type ExecutionFilters,
  usePaginatedExecutions,
} from "@/services/execution-service";
import { useWorkflows } from "@/services/workflow-service";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/utils";

const STATUS_OPTIONS: { value: ExecutionStatusType; label: string }[] = [
  { value: "started", label: "Started" },
  { value: "executing", label: "Executing" },
  { value: "completed", label: "Completed" },
  { value: "error", label: "Error" },
  { value: "cancelled", label: "Cancelled" },
];

export const createColumns = (
  getOrgUrl: (path: string) => string
): ColumnDef<ListExecutionsResponse["executions"][0]>[] => [
  {
    accessorKey: "workflowName",
    header: "Workflow",
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
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as WorkflowExecution["status"];
      return <ExecutionStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "startedAt",
    header: "Started",
    cell: ({ row }) => {
      const date = row.getValue("startedAt") as Date | string | undefined;
      if (!date) return <div className="font-medium">-</div>;
      try {
        const formatted = formatDate(date);
        return <div className="font-medium">{formatted}</div>;
      } catch {
        return <div className="font-medium">-</div>;
      }
    },
  },
  {
    accessorKey: "endedAt",
    header: "Ended",
    cell: ({ row }) => {
      const date = row.getValue("endedAt") as Date | string | undefined | null;
      if (!date) return <div className="font-medium">-</div>;
      try {
        const formatted = formatDate(date);
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
    accessorKey: "usage",
    header: "Usage",
    cell: ({ row }) => {
      const usage = row.getValue("usage") as number | undefined;
      return <span>{(usage ?? 0).toLocaleString()}</span>;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const workflowId = searchParams.get("workflowId") ?? undefined;
  const setWorkflowId = (id: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("workflowId", id);
      else next.delete("workflowId");
      return next;
    });
  };
  const [status, setStatus] = useState<ExecutionStatusType | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { workflows } = useWorkflows();

  const filters = useMemo<ExecutionFilters>(
    () => ({
      workflowId,
      status,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
    }),
    [workflowId, status, startDate, endDate]
  );

  const {
    paginatedExecutions,
    executionsError,
    isExecutionsInitialLoading,
    isExecutionsReachingEnd,
    executionsObserverTargetRef,
  } = usePaginatedExecutions(filters);

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
        <div className="mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Monitor the executions of your workflows.
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Select
            value={workflowId ?? "all"}
            onValueChange={(v) => setWorkflowId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workflows</SelectItem>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status ?? "all"}
            onValueChange={(v) =>
              setStatus(v === "all" ? undefined : (v as ExecutionStatusType))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-36 justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {startDate ? formatDate(startDate) : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => (endDate ? date > endDate : false)}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-36 justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {endDate ? formatDate(endDate) : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => (startDate ? date < startDate : false)}
              />
            </PopoverContent>
          </Popover>
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
