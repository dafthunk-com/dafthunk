import Building2 from "lucide-react/icons/building-2";
import Target from "lucide-react/icons/target";
import TrendingUp from "lucide-react/icons/trending-up";
import Users from "lucide-react/icons/users";
import Workflow from "lucide-react/icons/workflow";
import { useEffect } from "react";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats } from "@/services/admin-service";

export function AdminDashboardPage() {
  const { stats, statsError, isStatsLoading } = useAdminStats();
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

  return (
    <InsetLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              Total Deployments
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalDeployments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Deployed workflow versions
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
            <Users className="h-4 w-4 text-muted-foreground" />
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
      </div>
    </InsetLayout>
  );
}
