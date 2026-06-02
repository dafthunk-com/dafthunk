import type { ColumnDef } from "@tanstack/react-table";
import Archive from "lucide-react/icons/archive";
import Github from "lucide-react/icons/github";
import Inbox from "lucide-react/icons/inbox";
import Mail from "lucide-react/icons/mail";
import PenSquare from "lucide-react/icons/pen-square";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { OnboardingFunnel } from "@/components/admin/onboarding-funnel";
import { RoleBadge } from "@/components/admin/role-badge";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  type AdminThreadSummary,
  type AdminUserMembership,
  resendAdminUserWelcomeEmail,
  useAdminSupportThreads,
  useAdminUserBilling,
  useAdminUserDetail,
  useAdminUserExecutionsSummary,
  useAdminUserFunnel,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

function createThreadColumns(): ColumnDef<AdminThreadSummary>[] {
  return [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => {
        const thread = row.original;
        const href = `/admin/support?userId=${encodeURIComponent(thread.userId ?? "")}&threadId=${thread.id}`;
        return (
          <div className="flex items-center gap-2 min-w-0">
            {thread.unread && (
              <span
                className="h-2 w-2 rounded-full bg-blue-600 shrink-0"
                aria-label="Unread"
              />
            )}
            <Link
              to={href}
              className="font-medium hover:underline truncate"
              title={thread.subject || "(no subject)"}
            >
              {thread.subject || "(no subject)"}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: "archivedAt",
      header: "Status",
      cell: ({ row }) =>
        row.original.archivedAt ? (
          <Badge variant="secondary" className="gap-1">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        ) : (
          <Badge variant="outline">Open</Badge>
        ),
    },
    {
      accessorKey: "lastMessageAt",
      header: "Last message",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.lastMessageAt)}
        </span>
      ),
    },
  ];
}

function createMembershipColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminUserMembership>[] {
  return [
    {
      accessorKey: "organizationName",
      header: "Organization",
      cell: ({ row }) => (
        <Link
          to={`/admin/organizations/${row.original.organizationId}`}
          className="font-medium hover:underline"
        >
          {row.original.organizationName}
        </Link>
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
            onClick={() =>
              navigate(`/admin/organizations/${row.original.organizationId}`)
            }
          >
            View organization
          </DropdownMenuItem>
        </RowActionsMenu>
      ),
    },
  ];
}

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, memberships, userError, isUserLoading } =
    useAdminUserDetail(userId);
  const { funnel, isFunnelLoading } = useAdminUserFunnel(userId);
  const { executionsSummary, isExecutionsSummaryLoading } =
    useAdminUserExecutionsSummary(userId);
  const { billing, isBillingLoading } = useAdminUserBilling(userId);
  const {
    threads: recentThreads,
    pagination: threadsPagination,
    isThreadsLoading: isRecentThreadsLoading,
  } = useAdminSupportThreads(1, 5, "all", undefined, userId);
  const setBreadcrumbs = useBreadcrumbsSetter();
  const [resendOpen, setResendOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const membershipColumns = useMemo(
    () => createMembershipColumns(navigate),
    [navigate]
  );
  const threadColumns = useMemo(() => createThreadColumns(), []);
  const supportFilterHref = userId
    ? `/admin/support?userId=${encodeURIComponent(userId)}`
    : "/admin/support";

  const onConfirmResend = async () => {
    if (!userId) return;
    setIsResending(true);
    try {
      await resendAdminUserWelcomeEmail(userId);
      toast.success("Welcome email sent");
      setResendOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to send welcome email"
      );
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    setBreadcrumbs([
      { label: "Users", to: "/admin/users" },
      { label: user?.name || "User Details" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, user?.name]);

  if (isUserLoading) {
    return <InsetLoading title="User Details" />;
  }

  if (userError) {
    return <InsetError title="User Details" errorMessage={userError.message} />;
  }

  if (!user) {
    return <InsetError title="User Details" errorMessage="User not found" />;
  }

  const hasEmail = Boolean(user.email);
  const composeHref = user.email
    ? `/admin/support?compose=1&to=${encodeURIComponent(user.email)}`
    : "/admin/support";

  return (
    <InsetLayout title="User Details">
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant="outline"
          onClick={() => setResendOpen(true)}
          disabled={!hasEmail}
          title={hasEmail ? undefined : "User has no email on file"}
        >
          <Mail className="h-4 w-4 mr-2" />
          Resend welcome email
        </Button>
        <Button
          variant="outline"
          asChild={hasEmail}
          disabled={!hasEmail}
          title={hasEmail ? undefined : "User has no email on file"}
        >
          {hasEmail ? (
            <Link to={composeHref}>
              <PenSquare className="h-4 w-4 mr-2" />
              Start new thread
            </Link>
          ) : (
            <span>
              <PenSquare className="h-4 w-4 mr-2" />
              Start new thread
            </span>
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link to={supportFilterHref}>
            <Inbox className="h-4 w-4 mr-2" />
            View support threads
          </Link>
        </Button>
      </div>

      <AlertDialog open={resendOpen} onOpenChange={setResendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend welcome email?</AlertDialogTitle>
            <AlertDialogDescription>
              A fresh support thread will be created and the welcome email sent
              to <strong>{user.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmResend} disabled={isResending}>
              {isResending ? "Sending…" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{user.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {user.email || "No email"}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={user.plan === "pro" ? "default" : "secondary"}>
                {user.plan}
              </Badge>
              <Badge
                variant={user.role === "admin" ? "destructive" : "outline"}
              >
                {user.role}
              </Badge>
              {user.developerMode && <Badge variant="outline">Developer</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">User ID</div>
                <div className="font-mono text-xs">{user.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>{formatDate(user.createdAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Updated</div>
                <div>{formatDate(user.updatedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Providers</CardTitle>
            <CardDescription>Connected authentication methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <span>GitHub</span>
              {user.githubId ? (
                <Badge variant="default">Connected</Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google</span>
              {user.googleId ? (
                <Badge variant="default">Connected</Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Organization Memberships</CardTitle>
          <CardDescription>
            Organizations this user belongs to ({memberships.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            bare
            columns={membershipColumns}
            data={memberships}
            emptyState={{
              title: "No organizations",
              description: "This user is not a member of any organizations.",
            }}
          />
        </CardContent>
      </Card>

      {(() => {
        if (isBillingLoading) {
          return (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>Loading…</CardDescription>
              </CardHeader>
            </Card>
          );
        }
        if (!billing) return null;
        const isPro = billing.plan === "pro";
        const usageThisPeriod = billing.usageThisPeriod ?? 0;
        const includedCredits = billing.includedCredits ?? 0;
        const usagePercent = includedCredits
          ? Math.min(100, (usageThisPeriod / includedCredits) * 100)
          : 0;
        const hasOverageLimit = billing.overageLimit != null;
        const currentOverage = Math.max(0, usageThisPeriod - includedCredits);
        const overageLimit = billing.overageLimit ?? 0;
        const isOverageAtLimit =
          hasOverageLimit && currentOverage >= overageLimit;
        return (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Usage
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Early Adopter" : "Trial"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {isPro
                  ? "Monthly credits reset each billing period"
                  : "One-time credits for Trial accounts"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {isPro ? "Included Usage" : "Available Usage"}
                  </span>
                  <span>
                    {Math.min(
                      usageThisPeriod,
                      includedCredits
                    ).toLocaleString()}{" "}
                    / {includedCredits.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all rounded-full"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {usagePercent < 100
                    ? `${(includedCredits - usageThisPeriod).toLocaleString()} remaining`
                    : isPro
                      ? "Included usage exhausted"
                      : "Usage exhausted"}
                </p>
              </div>

              {isPro && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Additional Usage</span>
                    <span>
                      {currentOverage.toLocaleString()}
                      {hasOverageLimit && ` / ${overageLimit.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    {currentOverage > 0 && (
                      <div
                        className={`h-full transition-all rounded-full ${isOverageAtLimit ? "bg-red-500" : "bg-orange-500"}`}
                        style={{
                          width: hasOverageLimit
                            ? `${Math.min(100, (currentOverage / overageLimit) * 100)}%`
                            : `${Math.min(100, (currentOverage / includedCredits) * 100)}%`,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentOverage > 0
                      ? isOverageAtLimit
                        ? "Limit reached - executions will be blocked"
                        : "Billed at the end of the billing period"
                      : hasOverageLimit
                        ? `Limit: ${overageLimit.toLocaleString()} credits`
                        : "No overage charges yet"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <div className="mt-6">
        <OnboardingFunnel
          funnel={funnel}
          isFunnelLoading={isFunnelLoading}
          executionsSummary={executionsSummary}
          isExecutionsSummaryLoading={isExecutionsSummaryLoading}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Recent Support Threads</CardTitle>
            <CardDescription>
              {isRecentThreadsLoading
                ? "Loading…"
                : threadsPagination
                  ? `${threadsPagination.total} total (including archived)`
                  : "Including archived threads"}
            </CardDescription>
          </div>
          {threadsPagination && threadsPagination.total > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to={supportFilterHref}>View all</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            bare
            columns={threadColumns}
            data={recentThreads}
            emptyState={{
              title: "No support threads",
              description: "This user has no support threads on file.",
            }}
          />
        </CardContent>
      </Card>
    </InsetLayout>
  );
}
