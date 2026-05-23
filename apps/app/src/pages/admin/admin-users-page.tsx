import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableToolbar } from "@/components/admin/admin-table-toolbar";
import { OnboardingDots } from "@/components/admin/onboarding-dots";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAdminSearch } from "@/hooks/use-admin-search";
import { type AdminUser, useAdminUsers } from "@/services/admin-service";
import { formatDate } from "@/utils/date";

function createColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminUser>[] {
  return [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <Link
          to={`/admin/users/${row.original.id}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatarUrl || undefined} />
            <AvatarFallback>
              {row.original.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span>{row.original.name}</span>
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) =>
        row.original.email ? (
          <Link
            to={`/admin/support?compose=1&to=${encodeURIComponent(row.original.email)}`}
            className="text-muted-foreground hover:underline"
          >
            {row.original.email}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => (
        <Badge variant={row.original.plan === "pro" ? "default" : "secondary"}>
          {row.original.plan}
        </Badge>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant={row.original.role === "admin" ? "destructive" : "outline"}
        >
          {row.original.role}
        </Badge>
      ),
    },
    {
      id: "onboarding",
      header: "Onboarding",
      cell: ({ row }) => <OnboardingDots user={row.original} />,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsMenu>
          <DropdownMenuItem
            onClick={() => navigate(`/admin/users/${row.original.id}`)}
          >
            View
          </DropdownMenuItem>
        </RowActionsMenu>
      ),
    },
  ];
}

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Users" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const { users, pagination, usersError, isUsersLoading } = useAdminUsers(
    page,
    limit,
    search || undefined
  );

  const columns = useMemo(() => createColumns(navigate), [navigate]);

  if (isUsersLoading) {
    return <InsetLoading title="Users" />;
  }

  if (usersError) {
    return <InsetError title="Users" errorMessage={usersError.message} />;
  }

  return (
    <InsetLayout title="Users">
      <AdminTableToolbar
        searchPlaceholder="Search by name or email..."
        search={formProps}
      />

      <DataTable
        columns={columns}
        data={users}
        emptyState={{
          title: "No users found",
          description: search
            ? "No users match your search."
            : "No users have signed up yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={users.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="users"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
