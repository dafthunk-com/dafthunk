import type { ExecutionFeedback } from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import ThumbsDown from "lucide-react/icons/thumbs-down";
import ThumbsUp from "lucide-react/icons/thumbs-up";
import { useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useListFeedback } from "@/services/feedback-service";

export const createColumns = (
  getOrgUrl: (path: string) => string
): ColumnDef<ExecutionFeedback>[] => [
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
          {executionId.slice(0, 8)}...
        </Link>
      );
    },
  },
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
    accessorKey: "sentiment",
    header: "Rating",
    cell: ({ row }) => {
      const sentiment = row.getValue("sentiment") as "positive" | "negative";
      return (
        <div className="flex items-center gap-2">
          {sentiment === "positive" ? (
            <>
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                Good
              </Badge>
            </>
          ) : (
            <>
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <Badge variant="outline" className="text-red-600 border-red-600">
                Bad
              </Badge>
            </>
          )}
        </div>
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
    accessorKey: "deploymentId",
    header: "Deployment",
    cell: ({ row }) => {
      const deploymentId = row.getValue("deploymentId") as string | undefined;
      if (!deploymentId)
        return <span className="text-muted-foreground">-</span>;
      return (
        <Link
          to={getOrgUrl(`deployment/${deploymentId}`)}
          className="hover:underline font-mono text-xs"
        >
          {deploymentId.slice(0, 8)}...
        </Link>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | string;
      try {
        const formatted = format(new Date(date), "MMM d, yyyy h:mm a");
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

  const { feedbackList, feedbackListError, isFeedbackListLoading } =
    useListFeedback();

  // Get error message in a type-safe way
  const errorMessage = feedbackListError
    ? feedbackListError instanceof Error
      ? feedbackListError.message
      : "Unknown error"
    : "";

  useEffect(() => {
    setBreadcrumbs([{ label: "Feedback" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (feedbackListError) {
      toast.error(
        `Failed to fetch feedback: ${errorMessage}. Please try again.`
      );
    }
  }, [feedbackListError, errorMessage]);

  if (isFeedbackListLoading) {
    return <InsetLoading title="Feedback" />;
  } else if (feedbackListError) {
    return <InsetError title="Feedback" errorMessage={errorMessage} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Feedback">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            View and analyze user feedback on workflow executions.
          </div>
        </div>
        <DataTable
          columns={createColumns(getOrgUrl)}
          data={feedbackList}
          emptyState={{
            title: feedbackListError
              ? "Error"
              : feedbackList.length === 0
                ? "No feedback"
                : "No results",
            description: feedbackListError
              ? errorMessage
              : feedbackList.length === 0
                ? "No feedback has been submitted yet."
                : "No feedback matches your criteria.",
          }}
        />
      </InsetLayout>
    </TooltipProvider>
  );
}
