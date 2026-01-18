import { useEffect } from "react";
import { Link, useParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminOrganizationDetail,
  useAdminOrganizationEntityCounts,
} from "@/services/admin-service";

export function AdminOrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { organization, members, organizationError, isOrganizationLoading } =
    useAdminOrganizationDetail(organizationId);
  const { entityCounts, isEntityCountsLoading } =
    useAdminOrganizationEntityCounts(organizationId);
  const setBreadcrumbs = useBreadcrumbsSetter();

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
              @{organization.handle}
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
                <div>{new Date(organization.createdAt).toLocaleString()}</div>
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
                    ? new Date(
                        organization.currentPeriodStart
                      ).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Period End</div>
                <div>
                  {organization.currentPeriodEnd
                    ? new Date(
                        organization.currentPeriodEnd
                      ).toLocaleDateString()
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
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This organization has no members.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={member.userAvatarUrl || undefined}
                          />
                          <AvatarFallback>
                            {member.userName?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.userEmail || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "owner"
                            ? "default"
                            : member.role === "admin"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/users/${member.userId}`}>
                          View User
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
          to={`/admin/deployments?organizationId=${organizationId}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription>Deployments</CardDescription>
              <CardTitle className="text-2xl">
                {entityCounts?.deploymentCount ?? "-"}
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
