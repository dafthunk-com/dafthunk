import {
  type AdminUser,
  ONBOARDING_STAGE_LABEL,
  ONBOARDING_STAGES,
  type OnboardingStage,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

// Map each canonical stage to the timestamp on the user record. signed_up is
// always reached at user.createdAt — no per-stage column needed.
function getStageDate(user: AdminUser, stage: OnboardingStage): Date | null {
  switch (stage) {
    case "signed_up":
      return user.createdAt;
    case "tour_completed":
      return user.tourCompleted;
    case "workflow_created":
      return user.workflowCreated;
    case "workflow_executed":
      return user.workflowExecuted;
    case "workflow_executed_ok":
      return user.workflowExecutedOk;
  }
}

export function OnboardingDots({ user }: { user: AdminUser }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {ONBOARDING_STAGES.map((stage) => {
            const date = getStageDate(user, stage);
            const reached = date !== null;
            return (
              <Tooltip key={stage}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      reached ? "bg-primary" : "bg-muted"
                    )}
                    aria-label={ONBOARDING_STAGE_LABEL[stage]}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="font-medium">
                    {ONBOARDING_STAGE_LABEL[stage]}
                  </div>
                  <div className="text-muted-foreground">
                    {reached ? formatDate(date) : "Not reached"}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {ONBOARDING_STAGE_LABEL[user.furthestStage]}
        </span>
      </div>
    </TooltipProvider>
  );
}
