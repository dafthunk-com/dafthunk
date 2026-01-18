import Github from "lucide-react/icons/github";
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
import { useAdminUserDetail } from "@/services/admin-service";

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, memberships, userError, isUserLoading } =
    useAdminUserDetail(userId);
  const setBreadcrumbs = useBreadcrumbsSetter();

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

  return (
    <InsetLayout title="User Details">
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
              {user.tourCompleted && (
                <Badge variant="outline">Tour Completed</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">User ID</div>
                <div className="font-mono text-xs">{user.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>{new Date(user.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Updated</div>
                <div>{new Date(user.updatedAt).toLocaleString()}</div>
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
          {memberships.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This user is not a member of any organizations.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => (
                  <TableRow key={membership.organizationId}>
                    <TableCell className="font-medium">
                      {membership.organizationName}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {membership.organizationHandle}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          membership.role === "owner"
                            ? "default"
                            : membership.role === "admin"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {membership.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(membership.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to={`/admin/organizations/${membership.organizationId}`}
                        >
                          View Org
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
    </InsetLayout>
  );
}
