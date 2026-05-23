import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableToolbar } from "@/components/admin/admin-table-toolbar";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAdminSearch } from "@/hooks/use-admin-search";
import {
  type AdminOrganization,
  useAdminOrganizations,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

function createColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminOrganization>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          to={`/admin/organizations/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-sm">
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: "memberCount",
      header: "Members",
    },
    {
      accessorKey: "workflowCount",
      header: "Workflows",
    },
    {
      accessorKey: "computeCredits",
      header: "Credits",
      cell: ({ row }) => row.original.computeCredits.toLocaleString(),
    },
    {
      accessorKey: "subscriptionStatus",
      header: "Status",
      cell: ({ row }) =>
        row.original.subscriptionStatus ? (
          <Badge
            variant={
              row.original.subscriptionStatus === "active"
                ? "default"
                : "secondary"
            }
          >
            {row.original.subscriptionStatus}
          </Badge>
        ) : (
          <Badge variant="outline">trial</Badge>
        ),
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
            onClick={() => navigate(`/admin/organizations/${row.original.id}`)}
          >
            View
          </DropdownMenuItem>
        </RowActionsMenu>
      ),
    },
  ];
}

export function AdminOrganizationsPage() {
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Organizations" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const {
    organizations,
    pagination,
    organizationsError,
    isOrganizationsLoading,
  } = useAdminOrganizations(page, limit, search || undefined);

  const columns = useMemo(() => createColumns(navigate), [navigate]);

  if (isOrganizationsLoading) {
    return <InsetLoading title="Organizations" />;
  }

  if (organizationsError) {
    return (
      <InsetError
        title="Organizations"
        errorMessage={organizationsError.message}
      />
    );
  }

  return (
    <InsetLayout title="Organizations">
      <AdminTableToolbar
        searchPlaceholder="Search by name..."
        search={formProps}
      />

      <DataTable
        columns={columns}
        data={organizations}
        emptyState={{
          title: "No organizations found",
          description: search
            ? "No organizations match your search."
            : "No organizations have been created yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={organizations.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="organizations"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
