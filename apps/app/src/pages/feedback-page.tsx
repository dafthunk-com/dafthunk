import type { ExecutionFeedback } from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatDate } from "@/utils/date";
import CalendarIcon from "lucide-react/icons/calendar";
import DownloadIcon from "lucide-react/icons/download";
import ThumbsDown from "lucide-react/icons/thumbs-down";
import ThumbsUp from "lucide-react/icons/thumbs-up";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/ui/data-table";
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
  exportFeedbackCsv,
  useAllCriteria,
  usePaginatedFeedback,
} from "@/services/feedback-service";
import { useWorkflows } from "@/services/workflow-service";
import { cn } from "@/utils/utils";

export const createColumns = (
  getOrgUrl: (path: string) => string
): ColumnDef<ExecutionFeedback>[] => [
  {
    accessorKey: "workflowName",
    header: "Workflow",
    cell: ({ row }) => {
      const workflowId = row.original.workflowId;
      const workflowName = row.getValue("workflowName") as string | undefined;
      if (!workflowId) return <span className="text-muted-foreground">-</span>;
      return (
        <Link
          to={getOrgUrl(`workflows/${workflowId}`)}
          className="hover:underline"
        >
          {workflowName || workflowId.slice(0, 8) + "..."}
        </Link>
      );
    },
  },
  {
    accessorKey: "criterionQuestion",
    header: "Criterion",
    cell: ({ row }) => {
      const question = row.getValue("criterionQuestion") as string | undefined;
      if (!question) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="max-w-xs truncate" title={question}>
          {question}
        </div>
      );
    },
  },
  {
    accessorKey: "executionId",
    header: "Execution",
    cell: ({ row }) => {
      const executionId = row.getValue("executionId") as string;
      return (
        <Link
          to={getOrgUrl(`executions/${executionId}`)}
          className="hover:underline font-mono text-xs"
        >
          {executionId}
        </Link>
      );
    },
  },
  {
    accessorKey: "sentiment",
    header: "Rating",
    cell: ({ row }) => {
      const sentiment = row.getValue("sentiment") as "positive" | "negative";
      return sentiment === "positive" ? (
        <ThumbsUp className="h-4 w-4 text-green-600" />
      ) : (
        <ThumbsDown className="h-4 w-4 text-red-600" />
      );
    },
  },
  {
    accessorKey: "comment",
    header: "Comment",
    cell: ({ row }) => {
      const comment = row.getValue("comment") as string | undefined;
      if (!comment) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="max-w-md truncate" title={comment}>
          {comment}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | string;
      try {
        const formatted = formatDate(date);
        return <div className="font-medium">{formatted}</div>;
      } catch {
        return <div className="font-medium">-</div>;
      }
    },
  },
];

export function FeedbackPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();
  const { organization } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [workflowId, setWorkflowId] = useState<string | undefined>();
  const [criterionId, setCriterionId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const filters = useMemo(
    () => ({
      workflowId,
      criterionId,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
    }),
    [workflowId, criterionId, startDate, endDate]
  );

  const {
    feedbackList,
    feedbackError,
    isFeedbackInitialLoading,
    isFeedbackReachingEnd,
    feedbackObserverTargetRef,
  } = usePaginatedFeedback(filters);

  // Fetch workflows and criteria for filter dropdowns
  const { workflows } = useWorkflows();
  const { criteria } = useAllCriteria();

  // Filter criteria by selected workflow (if any)
  const filteredCriteria = workflowId
    ? criteria.filter((c) => c.workflowId === workflowId)
    : criteria;

  const errorMessage = feedbackError
    ? feedbackError instanceof Error
      ? feedbackError.message
      : "Unknown error"
    : "";

  useEffect(() => {
    setBreadcrumbs([{ label: "Feedback" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (feedbackError) {
      toast.error(
        `Failed to fetch feedback: ${errorMessage}. Please try again.`
      );
    }
  }, [feedbackError, errorMessage]);

  // Clear criterion filter when workflow changes
  useEffect(() => {
    setCriterionId(undefined);
  }, [workflowId]);

  const handleExport = useCallback(async () => {
    if (!organization?.id) return;
    setIsExporting(true);
    try {
      await exportFeedbackCsv(organization.id, filters);
    } catch {
      toast.error("Failed to export feedback");
    } finally {
      setIsExporting(false);
    }
  }, [organization?.id, filters]);

  if (isFeedbackInitialLoading) {
    return <InsetLoading title="Feedback" />;
  } else if (feedbackError) {
    return <InsetError title="Feedback" errorMessage={errorMessage} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Feedback">
        <div className="mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            View and analyze user feedback on workflow executions across all
            evaluation criteria.
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
            value={criterionId ?? "all"}
            onValueChange={(v) => setCriterionId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All criteria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All criteria</SelectItem>
              {filteredCriteria.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.question}
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

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || feedbackList.length === 0}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>

        <DataTable
          columns={createColumns(getOrgUrl)}
          data={feedbackList}
          emptyState={{
            title: feedbackError
              ? "Error"
              : feedbackList.length === 0
                ? "No feedback"
                : "No results",
            description: feedbackError
              ? errorMessage
              : feedbackList.length === 0
                ? "No feedback has been submitted yet."
                : "No feedback matches your filters.",
          }}
        />
        {!isFeedbackReachingEnd && !isFeedbackInitialLoading && (
          <div ref={feedbackObserverTargetRef} style={{ height: "1px" }} />
        )}
      </InsetLayout>
    </TooltipProvider>
  );
}
