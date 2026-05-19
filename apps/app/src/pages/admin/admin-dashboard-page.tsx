import Activity from "lucide-react/icons/activity";
import Building2 from "lucide-react/icons/building-2";
import TrendingUp from "lucide-react/icons/trending-up";
import UserCheck from "lucide-react/icons/user-check";
import Users from "lucide-react/icons/users";
import Workflow from "lucide-react/icons/workflow";
import { useEffect } from "react";

import { AdminTrendsCharts } from "@/components/admin/admin-trends-charts";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats } from "@/services/admin-service";

export function AdminDashboardPage() {
  const { stats, statsError, isStatsLoading } = useAdminStats(30);
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  if (isStatsLoading) {
    return <InsetLoading title="Dashboard" />;
  }

  if (statsError) {
    return <InsetError title="Dashboard" errorMessage={statsError.message} />;
  }

  const timeseries = stats?.timeseries ?? null;
  const executions30d =
    timeseries?.series.executions.reduce(
      (sum, point) => sum + point.count,
      0
    ) ?? 0;

  return (
    <InsetLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered users across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalOrganizations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active organizations on the platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Workflows
            </CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalWorkflows ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Workflows created across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Signups
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.recentSignups ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              New users in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeUsers24h ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Users active in the last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executions30d}</div>
            <p className="text-xs text-muted-foreground">
              Workflow runs in the last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <AdminTrendsCharts timeseries={timeseries} isLoading={false} />
    </InsetLayout>
  );
}
