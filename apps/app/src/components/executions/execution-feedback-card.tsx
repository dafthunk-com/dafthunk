import type { FeedbackSentimentType } from "@dafthunk/types";
import { format } from "date-fns";
import ThumbsDown from "lucide-react/icons/thumbs-down";
import ThumbsUp from "lucide-react/icons/thumbs-up";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateFeedback,
  useDeleteFeedback,
  useFeedback,
  useUpdateFeedback,
} from "@/services/feedback-service";

interface ExecutionFeedbackCardProps {
  executionId: string;
}

export function ExecutionFeedbackCard({
  executionId,
}: ExecutionFeedbackCardProps) {
  const { feedback, feedbackError, mutateFeedback } = useFeedback(executionId);
  const { createFeedback, isCreating } = useCreateFeedback();
  const { updateFeedback, isUpdating } = useUpdateFeedback();
  const { deleteFeedback, isDeleting } = useDeleteFeedback();

  const [mode, setMode] = useState<"view" | "input" | "edit">("view");
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
      // No feedback exists yet (404 is expected)
      setMode("input");
    }
  }, [feedback, feedbackError]);

  const handleSentimentClick = (sentiment: FeedbackSentimentType) => {
    if (mode === "view") return; // Read-only in view mode
    setSelectedSentiment(sentiment);
  };

  const handleSubmit = async () => {
    if (!selectedSentiment) {
      toast.error("Please select a rating");
      return;
    }

    try {
      if (mode === "input") {
        // Create new feedback
        await createFeedback({
          executionId,
          sentiment: selectedSentiment,
          comment: comment.trim() || undefined,
        });
        toast.success("Feedback submitted successfully");
      } else if (mode === "edit" && feedback) {
        // Update existing feedback
        await updateFeedback(feedback.id, {
          sentiment: selectedSentiment,
          comment: comment.trim() || undefined,
        });
        toast.success("Feedback updated successfully");
      }

      // Refresh feedback data
      await mutateFeedback();
      setMode("view");
    } catch (error) {
      toast.error(
        `Failed to ${mode === "input" ? "submit" : "update"} feedback: ${error instanceof Error ? error.message : "Unknown error"}`
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

    if (!confirm("Are you sure you want to delete your feedback?")) {
      return;
    }

    try {
      await deleteFeedback(feedback.id);
      toast.success("Feedback deleted successfully");

      // Reset to input mode
      setSelectedSentiment(null);
      setComment("");
      setMode("input");
      await mutateFeedback();
    } catch (error) {
      toast.error(
        `Failed to delete feedback: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleCancel = () => {
    if (feedback) {
      // Restore original values
      setSelectedSentiment(feedback.sentiment);
      setComment(feedback.comment || "");
      setMode("view");
    } else {
      // Clear input
      setSelectedSentiment(null);
      setComment("");
    }
  };

  const isLoading = isCreating || isUpdating || isDeleting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Execution Feedback</CardTitle>
        <CardDescription>
          {mode === "view"
            ? "Your feedback helps improve our workflows"
            : "Help us improve by rating this execution"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "view" && feedback ? (
          // Display Mode
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">You rated this:</p>
              <div className="flex items-center gap-2">
                {feedback.sentiment === "positive" ? (
                  <>
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">Good</span>
                  </>
                ) : (
                  <>
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-600">Bad</span>
                  </>
                )}
              </div>
            </div>

            {feedback.comment && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your comment:</p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">
                    {feedback.comment}
                  </p>
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Submitted on{" "}
              {format(new Date(feedback.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>

            <div className="flex gap-2 pt-2">
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
          // Input/Edit Mode
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">How was this execution?</p>
              <div className="flex gap-3">
                <Button
                  variant={
                    selectedSentiment === "positive" ? "default" : "outline"
                  }
                  className={
                    selectedSentiment === "positive"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                  onClick={() => handleSentimentClick("positive")}
                  disabled={isLoading}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Good
                </Button>
                <Button
                  variant={
                    selectedSentiment === "negative" ? "default" : "outline"
                  }
                  className={
                    selectedSentiment === "negative"
                      ? "bg-red-600 hover:bg-red-700"
                      : ""
                  }
                  onClick={() => handleSentimentClick("negative")}
                  disabled={isLoading}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Bad
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="feedback-comment"
                className="text-sm font-medium"
              >
                Add a comment (optional)
              </label>
              <Textarea
                id="feedback-comment"
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !selectedSentiment}
              >
                {isLoading
                  ? "Submitting..."
                  : mode === "edit"
                    ? "Update"
                    : "Submit"}
              </Button>
              {mode === "edit" && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
