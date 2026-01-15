import type { FeedbackSentimentType } from "@dafthunk/types";
import { format } from "date-fns";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import ThumbsDown from "lucide-react/icons/thumbs-down";
import ThumbsUp from "lucide-react/icons/thumbs-up";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateFeedback,
  useDeleteFeedback,
  useFeedback,
  useUpdateFeedback,
} from "@/services/feedback-service";
import { cn } from "@/utils/utils";

interface WorkflowFeedbackSectionProps {
  executionId: string;
}

export function WorkflowFeedbackSection({
  executionId,
}: WorkflowFeedbackSectionProps) {
  const { user } = useAuth();
  const isDeveloperMode = user?.developerMode ?? false;

  const { feedback, feedbackError, mutateFeedback } = useFeedback(executionId);
  const { createFeedback, isCreating } = useCreateFeedback();
  const { updateFeedback, isUpdating } = useUpdateFeedback();
  const { deleteFeedback, isDeleting } = useDeleteFeedback();

  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<"view" | "input" | "edit">("input");
  const [selectedSentiment, setSelectedSentiment] =
    useState<FeedbackSentimentType | null>(null);
  const [comment, setComment] = useState("");

  // Initialize mode based on feedback existence
  useEffect(() => {
    if (feedback) {
      setMode("view");
      setSelectedSentiment(feedback.sentiment);
      setComment(feedback.comment || "");
    } else if (
      feedbackError &&
      (feedbackError.message?.includes("404") ||
        feedbackError.message?.includes("not found"))
    ) {
      setMode("input");
    }
  }, [feedback, feedbackError]);

  // Only show feedback section for users with developer mode enabled
  if (!isDeveloperMode) {
    return null;
  }

  const handleSentimentClick = (sentiment: FeedbackSentimentType) => {
    if (mode === "view") return;
    setSelectedSentiment(sentiment);
  };

  const handleSubmit = async () => {
    if (!selectedSentiment) {
      toast.error("Please select a rating");
      return;
    }

    try {
      if (mode === "input") {
        await createFeedback({
          executionId,
          sentiment: selectedSentiment,
          comment: comment.trim() || undefined,
        });
        toast.success("Feedback submitted");
      } else if (mode === "edit" && feedback) {
        await updateFeedback(feedback.id, {
          sentiment: selectedSentiment,
          comment: comment.trim() || undefined,
        });
        toast.success("Feedback updated");
      }

      await mutateFeedback();
      setMode("view");
    } catch {
      toast.error(
        `Failed to ${mode === "input" ? "submit" : "update"} feedback`
      );
    }
  };

  const handleEdit = () => {
    if (feedback) {
      setSelectedSentiment(feedback.sentiment);
      setComment(feedback.comment || "");
      setMode("edit");
    }
  };

  const handleDelete = async () => {
    if (!feedback) return;

    if (!confirm("Delete your feedback?")) return;

    try {
      await deleteFeedback(feedback.id);
      toast.success("Feedback deleted");
      setSelectedSentiment(null);
      setComment("");
      setMode("input");
      await mutateFeedback();
    } catch {
      toast.error("Failed to delete feedback");
    }
  };

  const handleCancel = () => {
    if (feedback) {
      setSelectedSentiment(feedback.sentiment);
      setComment(feedback.comment || "");
      setMode("view");
    } else {
      setSelectedSentiment(null);
      setComment("");
    }
  };

  const isLoading = isCreating || isUpdating || isDeleting;

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="group w-full px-4 py-3 flex items-center justify-between"
      >
        <h2 className="text-base font-semibold text-foreground">Feedback</h2>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {mode === "view" && feedback ? (
            // View mode - show existing feedback
            <>
              <div className="flex items-center gap-2">
                {feedback.sentiment === "positive" ? (
                  <>
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      Good
                    </span>
                  </>
                ) : (
                  <>
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">
                      Bad
                    </span>
                  </>
                )}
              </div>

              {feedback.comment && (
                <div className="p-2 bg-muted rounded text-sm">
                  {feedback.comment}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {format(new Date(feedback.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={isLoading}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  Delete
                </Button>
              </div>
            </>
          ) : (
            // Input/Edit mode
            <>
              <p className="text-sm text-muted-foreground">
                How was this execution?
              </p>

              <div className="flex gap-2">
                <Button
                  variant={
                    selectedSentiment === "positive" ? "default" : "outline"
                  }
                  size="sm"
                  className={cn(
                    selectedSentiment === "positive" &&
                      "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={() => handleSentimentClick("positive")}
                  disabled={isLoading}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Good
                </Button>
                <Button
                  variant={
                    selectedSentiment === "negative" ? "default" : "outline"
                  }
                  size="sm"
                  className={cn(
                    selectedSentiment === "negative" &&
                      "bg-red-600 hover:bg-red-700"
                  )}
                  onClick={() => handleSentimentClick("negative")}
                  disabled={isLoading}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Bad
                </Button>
              </div>

              <Textarea
                placeholder="Add a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                disabled={isLoading}
                className="text-sm"
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isLoading || !selectedSentiment}
                >
                  {isLoading ? "..." : mode === "edit" ? "Update" : "Submit"}
                </Button>
                {mode === "edit" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
