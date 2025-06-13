import { Calendar, Layers } from "lucide-react";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { useUsageCredits } from "@/services/usage-service";
import { cn } from "@/utils/utils";

export function UsagePage() {
  const { usageData, usageError, isUsageLoading } = useUsageCredits();

  if (isUsageLoading) {
    return <InsetLoading title="Usage" />;
  }

  if (usageError) {
    return <InsetError title="Usage" errorMessage={usageError.message} />;
  }

  if (!usageData) {
    return <InsetError title="Usage" errorMessage="No usage data available" />;
  }

  const { computeCredits, computeUsage, usagePercentage, remainingCredits } =
    usageData;

  // Determine progress bar color based on usage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <InsetLayout title="Usage" childrenClassName="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Compute Credits</h2>
        <Badge
          variant="secondary"
          className="text-muted-foreground rounded-full"
        >
          This month
        </Badge>
      </div>

      {/* Credit Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Credits Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {computeCredits.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Total Credits
            </div>
          </div>
        </div>

        {/* Used Credits Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive mb-2">
              {computeUsage.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Used Credits
            </div>
          </div>
        </div>

        {/* Remaining Credits Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {remainingCredits.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Remaining
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Usage Progress</span>
            <span className="text-lg font-bold text-primary">
              {usagePercentage.toFixed(1)}%
            </span>
          </div>

          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full",
                getProgressColor(usagePercentage),
                usagePercentage >= 100 ? "rounded-full" : "rounded-l-full"
              )}
              style={{ width: `${Math.min(100, usagePercentage)}%` }}
            />
          </div>

          {/* Usage Status Message */}
          <div className="p-4 rounded-md bg-muted">
            {usagePercentage >= 90 ? (
              <p className="text-sm text-red-600 font-medium">
                ⚠️ You've used {usagePercentage.toFixed(1)}% of your compute
                credits. Consider upgrading your plan or contact support.
              </p>
            ) : usagePercentage >= 70 ? (
              <p className="text-sm text-yellow-600 font-medium">
                You've used {usagePercentage.toFixed(1)}% of your compute
                credits. Monitor your usage to avoid hitting limits.
              </p>
            ) : (
              <p className="text-sm text-green-600 font-medium">
                You're using {usagePercentage.toFixed(1)}% of your compute
                credits. You have plenty of credits remaining this month.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* How Credits Work Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">How Credits Work</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Compute credits are consumed based on the individual nodes that
                execute within your workflows. Each node type has a different
                credit cost depending on its computational requirements.
              </p>
              <p>
                The total cost of a workflow execution is the sum of all
                executed nodes. More complex workflows with many nodes or
                resource-intensive operations will consume more credits.
              </p>
            </div>
          </div>
        </div>

        {/* Credit Cycle Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Credit Cycle</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Credits reset monthly at the beginning of each month. Your usage
                counter returns to zero and you receive your full monthly
                allocation.
              </p>
              <p>
                Unused credits do not roll over to the next month, so make sure
                to utilize your full allocation each month.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InsetLayout>
  );
}
