import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { RoleBadge } from "@/components/admin/role-badge";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  type AdminOrganizationMember,
  useAdminOrganizationDetail,
  useAdminOrganizationEntityCounts,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

function createMemberColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminOrganizationMember>[] {
  return [
    {
      accessorKey: "userName",
      header: "User",
      cell: ({ row }) => (
        <Link
          to={`/admin/users/${row.original.userId}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.userAvatarUrl || undefined} />
            <AvatarFallback>
              {row.original.userName?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span>{row.original.userName}</span>
        </Link>
      ),
    },
    {
      accessorKey: "userEmail",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.userEmail || "-"}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.joinedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsMenu>
          <DropdownMenuItem
            onClick={() => navigate(`/admin/users/${row.original.userId}`)}
          >
            View user
          </DropdownMenuItem>
        </RowActionsMenu>
      ),
    },
  ];
}

export function AdminOrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { organization, members, organizationError, isOrganizationLoading } =
    useAdminOrganizationDetail(organizationId);
  const { entityCounts, isEntityCountsLoading } =
    useAdminOrganizationEntityCounts(organizationId);
  const setBreadcrumbs = useBreadcrumbsSetter();

  const memberColumns = useMemo(
    () => createMemberColumns(navigate),
    [navigate]
  );

  useEffect(() => {
    setBreadcrumbs([
      { label: "Organizations", to: "/admin/organizations" },
      { label: organization?.name || "Organization Details" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, organization?.name]);

  if (isOrganizationLoading || isEntityCountsLoading) {
    return <InsetLoading title="Organization Details" />;
  }

  if (organizationError) {
    return (
      <InsetError
        title="Organization Details"
        errorMessage={organizationError.message}
      />
    );
  }

  if (!organization) {
    return (
      <InsetError
        title="Organization Details"
        errorMessage="Organization not found"
      />
    );
  }

  return (
    <InsetLayout title="Organization Details">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{organization.name}</CardTitle>
            <CardDescription className="font-mono">
              @{organization.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {organization.subscriptionStatus ? (
                <Badge
                  variant={
                    organization.subscriptionStatus === "active"
                      ? "default"
                      : "secondary"
                  }
                >
                  {organization.subscriptionStatus}
                </Badge>
              ) : (
                <Badge variant="outline">trial</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Organization ID</div>
                <div className="font-mono text-xs">{organization.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>{formatDate(organization.createdAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Compute Credits</div>
                <div>{organization.computeCredits.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Overage Limit</div>
                <div>
                  {organization.overageLimit
                    ? organization.overageLimit.toLocaleString()
                    : "Unlimited"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Stripe subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Stripe Customer ID</div>
                <div className="font-mono text-xs">
                  {organization.stripeCustomerId || "-"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Subscription ID</div>
                <div className="font-mono text-xs">
                  {organization.stripeSubscriptionId || "-"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Period Start</div>
                <div>
                  {organization.currentPeriodStart
                    ? formatDate(organization.currentPeriodStart)
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Period End</div>
                <div>
                  {organization.currentPeriodEnd
                    ? formatDate(organization.currentPeriodEnd)
                    : "-"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Users who belong to this organization ({members.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            bare
            columns={memberColumns}
            data={members}
            emptyState={{
              title: "No members",
              description: "This organization has no members.",
            }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Link
          to={`/admin/workflows?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Workflows</CardDescription>
              <CardTitle className="text-2xl">
                {entityCounts?.workflowCount ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link
          to={`/admin/executions?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Executions</CardDescription>
              <CardTitle className="text-2xl">-</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link
          to={`/admin/emails?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Emails</CardDescription>
              <CardTitle className="text-2xl">
                {entityCounts?.emailCount ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link
          to={`/admin/queues?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Queues</CardDescription>
              <CardTitle className="text-2xl">
                {entityCounts?.queueCount ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link
          to={`/admin/datasets?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Datasets</CardDescription>
              <CardTitle className="text-2xl">
                {entityCounts?.datasetCount ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link
          to={`/admin/databases?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Databases</CardDescription>
              <CardTitle className="text-2xl">
                {entityCounts?.databaseCount ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </InsetLayout>
  );
}
