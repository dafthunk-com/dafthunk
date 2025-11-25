import CreditCard from "lucide-react/icons/credit-card";
import Layers from "lucide-react/icons/layers";
import Logs from "lucide-react/icons/logs";
import Minus from "lucide-react/icons/minus";
import Plus from "lucide-react/icons/plus";
import Target from "lucide-react/icons/target";
import Workflow from "lucide-react/icons/workflow";
import { useEffect } from "react";
import { Link } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDashboard, useUsage } from "@/services/dashboard-service";
import { cn } from "@/utils/utils";

export function DashboardPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { dashboardStats, dashboardStatsError, isDashboardStatsLoading } =
    useDashboard();
  const { usageData, usageError, isUsageLoading } = useUsage();
  const { getOrgUrl } = useOrgUrl();

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
    return "bg-blue-500";
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
              Number of workflows
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to={getOrgUrl("workflows")}>View Workflows</Link>
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
              Number of deployments
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to={getOrgUrl("deployments")}>View Deployments</Link>
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
            <p className="text-xs text-muted-foreground pt-1">
              Number of executions
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to={getOrgUrl("executions")}>View Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Credits Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Credits Limit Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Credits</CardTitle>
            <CreditCard className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {computeCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground pt-1">Credits limit</p>
          </CardContent>
        </Card>

        {/* Credits Used Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Used</CardTitle>
            <Minus className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {computeUsage.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground pt-1">Credits used</p>
          </CardContent>
        </Card>

        {/* Credits Remaining Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Remaining</CardTitle>
            <Plus className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {remainingCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Credits remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Usage Progress</span>
            <span className="text-2xl font-bold">
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
              <p className="text-sm text-muted-foreground">
                {usagePercentage.toFixed(1)}% of compute credits used
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How Credits Work Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xl">How Credits Work</CardTitle>
          <Layers className="size-8 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Compute credits are consumed by individual nodes within your
              workflows. Each node type has different credit costs based on
              computational requirements.
            </p>
            <p>
              The total cost of a workflow execution is the sum of all executed
              nodes. More complex workflows consume more credits.
            </p>
          </div>
        </CardContent>
      </Card>
    </InsetLayout>
  );
}
