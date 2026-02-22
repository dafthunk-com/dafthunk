import type { FeedbackCriterion, FeedbackSentimentType } from "@dafthunk/types";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import MessageCircleIcon from "lucide-react/icons/message-circle";
import MessageCircleQuestion from "lucide-react/icons/message-circle-question";
import ThumbsDown from "lucide-react/icons/thumbs-down";
import ThumbsUp from "lucide-react/icons/thumbs-up";
import TrashIcon from "lucide-react/icons/trash-2";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteFeedback,
  useDeploymentCriteria,
  useFeedback,
  useUpsertFeedback,
  useWorkflowCriteria,
} from "@/services/feedback-service";
import { cn } from "@/utils/utils";

interface WorkflowFeedbackSectionProps {
  executionId: string;
  workflowId?: string;
  deploymentId?: string;
  disabled?: boolean;
}

export function WorkflowFeedbackSection({
  executionId,
  workflowId,
  deploymentId,
  disabled = false,
}: WorkflowFeedbackSectionProps) {
  const { user } = useAuth();
  const isDeveloperMode = user?.developerMode ?? false;

  const { criteria: deploymentCriteria } = useDeploymentCriteria(
    deploymentId || null
  );
  const { criteria: workflowCriteria } = useWorkflowCriteria(
    !deploymentId && workflowId ? workflowId : null
  );
  const criteria =
    deploymentCriteria.length > 0 ? deploymentCriteria : workflowCriteria;
  const { feedbackList, mutateFeedback } = useFeedback(executionId);
  const { upsertFeedback } = useUpsertFeedback();
  const { deleteFeedback } = useDeleteFeedback();

  const [expanded, setExpanded] = useState(true);

  // Build a map from criterionId to submitted feedback
  const feedbackMap = new Map(feedbackList.map((f) => [f.criterionId, f]));

  const handleDelete = useCallback(
    async (feedbackId: string) => {
      try {
        await deleteFeedback(feedbackId);
        await mutateFeedback();
      } catch {
        toast.error("Failed to delete feedback");
      }
    },
    [deleteFeedback, mutateFeedback]
  );

  const handleUpsert = useCallback(
    async (
      criterionId: string,
      sentiment: FeedbackSentimentType,
      comment?: string
    ) => {
      try {
        await upsertFeedback({
          executionId,
          criterionId,
          sentiment,
          comment,
        });
        await mutateFeedback();
      } catch {
        toast.error("Failed to save feedback");
      }
    },
    [executionId, upsertFeedback, mutateFeedback]
  );

  if (!isDeveloperMode) return null;

  const noCriteria = criteria.length === 0;

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
          <p className="text-sm text-muted-foreground">
            Rate this execution on each criterion.
          </p>
          {noCriteria ? (
            <p className="text-sm text-muted-foreground">
              No evaluation criteria configured.
            </p>
          ) : (
            <div className="space-y-1">
              {criteria.map((criterion) => {
                const fb = feedbackMap.get(criterion.id);
                return (
                  <CriterionRow
                    key={criterion.id}
                    criterion={criterion}
                    submitted={fb}
                    onUpsert={handleUpsert}
                    onDelete={fb ? () => handleDelete(fb.id) : undefined}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CriterionRow({
  criterion,
  submitted,
  onUpsert,
  onDelete,
  disabled,
}: {
  criterion: FeedbackCriterion;
  submitted?: {
    sentiment: string;
    comment?: string;
  };
  onUpsert: (
    criterionId: string,
    sentiment: FeedbackSentimentType,
    comment?: string
  ) => Promise<void>;
  onDelete?: () => void;
  disabled: boolean;
}) {
  const [showComment, setShowComment] = useState(!!submitted?.comment);
  const [comment, setComment] = useState(submitted?.comment ?? "");
  const commentTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sentiment = submitted
    ? (submitted.sentiment as FeedbackSentimentType)
    : null;

  const handleSentiment = (s: FeedbackSentimentType) => {
    if (disabled) return;
    onUpsert(criterion.id, s, comment.trim() || undefined);
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    // Debounce comment saves — only save if sentiment is already set
    if (!sentiment) return;
    if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
    commentTimerRef.current = setTimeout(() => {
      onUpsert(criterion.id, sentiment, value.trim() || undefined);
    }, 800);
  };

  return (
    <div className="border border-border rounded-md">
      <div className="flex items-center gap-2 px-3 py-2">
        <MessageCircleQuestion className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm truncate" title={criterion.question}>
          {criterion.question}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleSentiment("positive")}
            disabled={disabled}
            className={cn(
              "p-1 rounded transition-colors",
              sentiment === "positive"
                ? "text-green-600"
                : "text-muted-foreground/40 hover:text-green-600",
              disabled && "cursor-default"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleSentiment("negative")}
            disabled={disabled}
            className={cn(
              "p-1 rounded transition-colors",
              sentiment === "negative"
                ? "text-red-600"
                : "text-muted-foreground/40 hover:text-red-600",
              disabled && "cursor-default"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowComment(!showComment)}
            className={cn(
              "p-1 rounded transition-colors",
              showComment || comment
                ? "text-foreground"
                : "text-muted-foreground/40 hover:text-foreground"
            )}
          >
            <MessageCircleIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={disabled || !onDelete}
            className={cn(
              "p-1 rounded transition-colors",
              onDelete && !disabled
                ? "text-muted-foreground/40 hover:text-red-600"
                : "text-muted-foreground/20 cursor-default"
            )}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {showComment && (
        <div className="px-3 pb-2">
          <Textarea
            placeholder="Optional comment..."
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            rows={2}
            disabled={disabled}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
}
