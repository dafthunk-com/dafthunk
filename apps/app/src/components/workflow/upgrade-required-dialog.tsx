import type { NodeType } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import Sparkles from "lucide-react/icons/sparkles";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrgUrl } from "@/hooks/use-org-url";

export interface UpgradeRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Node types (with `subscription: true`) that triggered the prompt. */
  gatedNodeTypes: NodeType[];
  /** When true, the prompt is reacting to a failed run rather than a pre-flight gate. */
  variant?: "preflight" | "post-failure";
}

export function UpgradeRequiredDialog({
  open,
  onOpenChange,
  gatedNodeTypes,
  variant = "preflight",
}: UpgradeRequiredDialogProps) {
  const navigate = useNavigate();
  const { getOrgUrl } = useOrgUrl();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate(getOrgUrl("billing"));
  };

  const title =
    variant === "post-failure"
      ? "Upgrade to run this workflow"
      : "Upgrade to use these nodes";

  const description =
    variant === "post-failure"
      ? "This workflow uses nodes that require the Early Adopter plan. Upgrade to run it."
      : gatedNodeTypes.length === 1
        ? "This node requires the Early Adopter plan to execute."
        : "These nodes require the Early Adopter plan to execute.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {gatedNodeTypes.length > 0 && (
          <ul className="rounded-md border border-border divide-y divide-border max-h-64 overflow-y-auto">
            {gatedNodeTypes.map((nodeType) => (
              <li
                key={nodeType.type}
                className="flex items-center gap-3 px-3 py-2"
              >
                {nodeType.icon ? (
                  <DynamicIcon
                    name={nodeType.icon as any}
                    className="h-4 w-4 text-muted-foreground shrink-0"
                  />
                ) : (
                  <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {nodeType.name}
                  </p>
                  {nodeType.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {nodeType.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button onClick={handleUpgrade}>Upgrade to Early Adopter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
