import CheckCircle2 from "lucide-react/icons/check-circle-2";
import Circle from "lucide-react/icons/circle";
import CircleDashed from "lucide-react/icons/circle-dashed";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AdminUserExecutionsSummary,
  type AdminUserFunnel,
  type OnboardingStage,
} from "@/services/admin-service";
import { cn } from "@/utils/utils";

interface OnboardingFunnelProps {
  funnel: AdminUserFunnel | null;
  isFunnelLoading: boolean;
  executionsSummary: AdminUserExecutionsSummary | null;
  isExecutionsSummaryLoading: boolean;
}

interface StageRow {
  key: OnboardingStage | "workflow_executed" | "workflow_executed_successfully";
  label: string;
  description: string;
  reached: boolean;
  at: Date | null;
  pending?: boolean;
}

function formatStageTimestamp(at: Date | null): string {
  if (!at) return "—";
  try {
    return new Date(at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(at);
  }
}

export function OnboardingFunnel({
  funnel,
  isFunnelLoading,
  executionsSummary,
  isExecutionsSummaryLoading,
}: OnboardingFunnelProps) {
  if (isFunnelLoading || !funnel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
          <CardDescription>
            Funnel progress for this user's primary organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const executionsReached =
    executionsSummary !== null && executionsSummary.totalExecutions > 0;
  const successReached =
    executionsSummary !== null && executionsSummary.successCount > 0;

  const stages: StageRow[] = [
    {
      key: "signed_up",
      label: "Signed up",
      description: "Account created",
      reached: funnel.signedUp.reached,
      at: funnel.signedUp.at,
    },
    {
      key: "workflow_created",
      label: "Created a workflow",
      description: `${funnel.workflowCreated.count} workflow(s) in this user's org`,
      reached: funnel.workflowCreated.reached,
      at: funnel.workflowCreated.at,
    },
    {
      key: "workflow_executed",
      label: "Executed a workflow",
      description: executionsSummary
        ? `${executionsSummary.totalExecutions} total execution(s)`
        : "Loading execution stats…",
      reached: executionsReached,
      at: executionsSummary?.firstExecutionAt ?? null,
      pending: isExecutionsSummaryLoading,
    },
    {
      key: "workflow_executed_successfully",
      label: "Successful execution",
      description: executionsSummary
        ? `${executionsSummary.successCount} succeeded · ${executionsSummary.errorCount} failed`
        : "Loading execution stats…",
      reached: successReached,
      at: executionsSummary?.firstSuccessAt ?? null,
      pending: isExecutionsSummaryLoading,
    },
  ];

  const furthestReachedIndex = (() => {
    let last = -1;
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].reached) last = i;
    }
    return last;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding</CardTitle>
        <CardDescription>
          Funnel progress for this user's primary organization. Workflow and
          execution stages are attributed via the user's primary org, so
          multi-member orgs share progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {stages.map((stage, index) => {
            const isFurthest = index === furthestReachedIndex;
            const Icon = stage.reached
              ? CheckCircle2
              : stage.pending
                ? CircleDashed
                : Circle;

            return (
              <li key={stage.key} className="flex items-start gap-3">
                <Icon
                  className={cn(
                    "h-5 w-5 mt-0.5 shrink-0",
                    stage.reached
                      ? "text-emerald-600"
                      : stage.pending
                        ? "text-muted-foreground"
                        : "text-muted-foreground/40"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        !stage.reached && "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </span>
                    {isFurthest && funnel.daysSinceAdvance > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {funnel.daysSinceAdvance} day
                        {funnel.daysSinceAdvance === 1 ? "" : "s"} at this stage
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stage.description}
                  </div>
                  {stage.pending && !executionsSummary ? (
                    <Skeleton className="h-3 w-32 mt-1" />
                  ) : (
                    stage.reached && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatStageTimestamp(stage.at)}
                      </div>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
