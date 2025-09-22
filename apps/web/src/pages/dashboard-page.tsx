import {
  AlertCircle,
  Clock,
  CreditCard,
  Layers,
  Logs,
  Target,
  Workflow,
} from "lucide-react";
import { Link } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDashboard, useUsageCredits } from "@/services/dashboard-service";
import { cn } from "@/utils/utils";

export function DashboardPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { dashboardStats, dashboardStatsError, isDashboardStatsLoading } =
    useDashboard();
  const { usageData, usageError, isUsageLoading } = useUsageCredits();

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  if (isDashboardStatsLoading || isUsageLoading) {
    return <InsetLoading title="Dashboard" />;
  } else if (dashboardStatsError || usageError) {
    return (
      <InsetError
        title="Dashboard"
        errorMessage={
          dashboardStatsError?.message ||
          usageError?.message ||
          "An error occurred"
        }
      />
    );
  }

  if (!dashboardStats || !usageData) {
    return (
      <InsetLayout title="Dashboard">
        <div className="flex flex-1 items-center justify-center">
          No dashboard data available.
        </div>
      </InsetLayout>
    );
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
    <InsetLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Workflows</CardTitle>
            <Workflow className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardStats.workflows}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Total workflows created
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/org/workflows">Go to Workflows</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Deployments</CardTitle>
            <Target className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {dashboardStats.deployments}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Active deployments
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/org/deployments">View Deployments</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Executions</CardTitle>
            <Logs className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {dashboardStats.executions.total}
            </div>
            <div className="text-xs text-muted-foreground pt-1 flex gap-3">
              <div className="flex items-center gap-1">
                <span className="flex size-2 translate-y-px rounded-full bg-blue-500" />
                <span>{dashboardStats.executions.running} running</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1">
                  <AlertCircle className="size-3 text-red-500" />
                  {dashboardStats.executions.failed} failed
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>
                  Avg. time: {dashboardStats.executions.avgTimeSeconds}s
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to="/org/executions">View All Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Credits Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Total Credits Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Total Credits</CardTitle>
            <CreditCard className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {computeCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Available this month
            </p>
            <Badge variant="secondary" className="mt-2 text-xs">
              Monthly allocation
            </Badge>
          </CardContent>
        </Card>

        {/* Used Credits Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Used Credits</CardTitle>
            <Layers className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">
              {computeUsage.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Credits consumed
            </p>
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
              <span className="flex size-2 translate-y-px rounded-full bg-red-500" />
              <span>{usagePercentage.toFixed(1)}% of total</span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Credits Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Remaining</CardTitle>
            <Clock className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {remainingCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Credits left this month
            </p>
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
              <span className="flex size-2 translate-y-px rounded-full bg-green-500" />
              <span>
                {usagePercentage >= 90
                  ? "Low remaining"
                  : usagePercentage >= 70
                    ? "Moderate usage"
                    : "Plenty remaining"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Usage Progress</span>
            <span className="text-2xl font-bold text-primary">
              {usagePercentage.toFixed(1)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
        </CardContent>
      </Card>

      {/* How Credits Work Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            How Credits Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Compute credits are consumed based on the individual nodes that
              execute within your workflows. Each node type has a different
              credit cost depending on its computational requirements.
            </p>
            <p>
              The total cost of a workflow execution is the sum of all executed
              nodes. More complex workflows with many nodes or
              resource-intensive operations will consume more credits.
            </p>
          </div>
        </CardContent>
      </Card>
    </InsetLayout>
  );
}
