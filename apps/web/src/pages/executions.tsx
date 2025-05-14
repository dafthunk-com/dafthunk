import { useEffect, useState } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, Filter, MoreHorizontal, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useSearchParams } from "react-router-dom";
import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { usePaginatedExecutions } from "@/services/executionsService";
import { toast } from "sonner";
import { InsetLoading } from "@/components/inset-loading";
import { InsetError } from "@/components/inset-error";
import type { ListExecutionsRequest, WorkflowExecution } from "@dafthunk/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const columns: ColumnDef<WorkflowExecution>[] = [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => {
      const workflowName = row.getValue("workflowName") as string;
      const execution = row.original as WorkflowExecution;
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get filter values from URL
  const workflowId = searchParams.get("workflowId") || undefined;
  const deploymentId = searchParams.get("deploymentId") || undefined;
  
  // Local state for filter inputs
  const [filterValues, setFilterValues] = useState<Partial<ListExecutionsRequest>>({
    workflowId,
    deploymentId
  });
  
  // Filter dialog state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const {
    paginatedExecutions,
    executionsError,
    isExecutionsInitialLoading,
    isExecutionsLoadingMore,
    isExecutionsReachingEnd,
    executionsObserverTargetRef,
  } = usePaginatedExecutions(workflowId, deploymentId);

  // Get error message in a type-safe way
  const errorMessage = executionsError 
    ? executionsError instanceof Error 
      ? executionsError.message 
      : 'Unknown error' 
    : '';

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
  
  // Apply filters
  const handleApplyFilters = () => {
    const newParams = new URLSearchParams();
    
    if (filterValues.workflowId) {
      newParams.set("workflowId", filterValues.workflowId);
    }
    
    if (filterValues.deploymentId) {
      newParams.set("deploymentId", filterValues.deploymentId);
    }
    
    setSearchParams(newParams);
    setIsFilterOpen(false);
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setFilterValues({});
    setSearchParams(new URLSearchParams());
    setIsFilterOpen(false);
  };
  
  // Check if filters are active
  const hasActiveFilters = Boolean(workflowId || deploymentId);

  if (isExecutionsInitialLoading) {
    return <InsetLoading title="Executions" />;
  } else if (executionsError) {
    return (
      <InsetError title="Executions" errorMessage={errorMessage} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout
        title="Executions"
        titleRight={
          <div className="flex items-center gap-2">
            {isExecutionsLoadingMore && <Spinner className="h-4 w-4" />}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant={hasActiveFilters ? "default" : "outline"} 
                  size="sm"
                  className={hasActiveFilters ? "bg-primary" : ""}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="outline" className="ml-2 bg-background text-foreground">
                      {Object.values({ workflowId, deploymentId }).filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filter Executions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflowId">Workflow ID</Label>
                    <Input
                      id="workflowId"
                      placeholder="Filter by workflow ID"
                      value={filterValues.workflowId || ""}
                      onChange={(e) => 
                        setFilterValues(prev => ({ ...prev, workflowId: e.target.value || undefined }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deploymentId">Deployment ID</Label>
                    <Input
                      id="deploymentId"
                      placeholder="Filter by deployment ID"
                      value={filterValues.deploymentId || ""}
                      onChange={(e) => 
                        setFilterValues(prev => ({ ...prev, deploymentId: e.target.value || undefined }))
                      }
                    />
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={handleClearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleApplyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
          {hasActiveFilters && (
            <span className="ml-2 text-primary">
              (Filtered results)
            </span>
          )}
        </p>
        <DataTable
          columns={columns}
          data={paginatedExecutions}
          emptyState={{
            title: executionsError
              ? "Error"
              : paginatedExecutions.length === 0
                ? hasActiveFilters ? "No matching executions" : "No executions"
                : "No results",
            description:
              executionsError
                ? errorMessage
                : (paginatedExecutions.length === 0
                  ? hasActiveFilters 
                    ? "No executions match your filter criteria."
                    : "No executions found." 
                  : "No executions match your criteria."),
          }}
        />
        {!isExecutionsReachingEnd && !isExecutionsInitialLoading && (
          <div ref={executionsObserverTargetRef} style={{ height: "1px" }} />
        )}
      </InsetLayout>
    </TooltipProvider>
  );
}
