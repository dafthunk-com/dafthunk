import type { FeedbackCriterion } from "@dafthunk/types";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import MessageCircleQuestion from "lucide-react/icons/message-circle-question";
import PlusIcon from "lucide-react/icons/plus";
import TrashIcon from "lucide-react/icons/trash-2";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateCriterion,
  useDeleteCriterion,
  useUpdateCriterion,
  useWorkflowCriteria,
} from "@/services/feedback-service";
import { cn } from "@/utils/utils";

interface WorkflowCriteriaManagerProps {
  workflowId: string;
}

export function WorkflowCriteriaManager({
  workflowId,
}: WorkflowCriteriaManagerProps) {
  const { criteria, mutateCriteria } = useWorkflowCriteria(workflowId);
  const { createCriterion, isCreating } = useCreateCriterion();
  const { updateCriterion } = useUpdateCriterion();
  const { deleteCriterion } = useDeleteCriterion();

  const [expanded, setExpanded] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState("");

  const handleAdd = async () => {
    const question = newQuestion.trim();
    if (!question) return;

    try {
      await createCriterion({
        workflowId,
        question,
        displayOrder: criteria.length,
      });
      setNewQuestion("");
      await mutateCriteria();
    } catch {
      toast.error("Failed to add criterion");
    }
  };

  const handleEditStart = (criterion: FeedbackCriterion) => {
    setEditingId(criterion.id);
    setEditingQuestion(criterion.question);
  };

  const handleEditSave = async (id: string) => {
    const question = editingQuestion.trim();
    if (!question) return;

    try {
      await updateCriterion(id, { question });
      setEditingId(null);
      await mutateCriteria();
    } catch {
      toast.error("Failed to update criterion");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCriterion(id);
      await mutateCriteria();
    } catch {
      toast.error("Failed to delete criterion");
    }
  };

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="group w-full px-4 py-3 flex items-center justify-between"
      >
        <h2 className="text-base font-semibold text-foreground">
          Evaluation Criteria
        </h2>
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
            Define binary evaluation questions for this workflow. These are
            frozen when you deploy.
          </p>

          {criteria.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No criteria configured yet.
            </p>
          )}

          <div className="space-y-1">
            {criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="group flex items-center gap-2 px-3 py-2 border border-border rounded-md"
              >
                <MessageCircleQuestion className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {editingId === criterion.id ? (
                  <input
                    value={editingQuestion}
                    onChange={(e) => setEditingQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(criterion.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => handleEditSave(criterion.id)}
                    autoFocus
                    className="flex-1 text-sm bg-transparent outline-none min-w-0"
                  />
                ) : (
                  <button
                    onClick={() => handleEditStart(criterion)}
                    className="flex-1 text-left text-sm truncate"
                    title={criterion.question}
                  >
                    {criterion.question}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(criterion.id)}
                  className="p-1 rounded transition-colors text-muted-foreground/40 hover:text-red-600 shrink-0"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Add evaluation question..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              disabled={isCreating}
              className="text-sm h-8"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={isCreating || !newQuestion.trim()}
              className="h-8 px-2"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
