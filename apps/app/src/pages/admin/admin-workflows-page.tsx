import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableToolbar } from "@/components/admin/admin-table-toolbar";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAdminSearch } from "@/hooks/use-admin-search";
import {
  type AdminWorkflow,
  useAdminWorkflows,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

function createColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminWorkflow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <Link
            to={`/admin/workflows/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
          <div className="text-xs text-muted-foreground font-mono">
            {row.original.id}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "organizationName",
      header: "Organization",
      cell: ({ row }) => (
        <Link
          to={`/admin/organizations/${row.original.organizationId}`}
          className="hover:underline"
        >
          {row.original.organizationName}
        </Link>
      ),
    },
    {
      accessorKey: "trigger",
      header: "Trigger",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.trigger}</Badge>
      ),
    },
    {
      accessorKey: "runtime",
      header: "Runtime",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.runtime}</Badge>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Enabled",
      cell: ({ row }) =>
        row.original.enabled ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        ),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsMenu>
          <DropdownMenuItem
            onClick={() => navigate(`/admin/workflows/${row.original.id}`)}
          >
            View workflow
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              navigate(`/admin/executions?workflowId=${row.original.id}`)
            }
          >
            View executions
          </DropdownMenuItem>
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

export function AdminWorkflowsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Workflows" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { workflows, pagination, workflowsError, isWorkflowsLoading } =
    useAdminWorkflows(page, limit, search || undefined, organizationId);

  const columns = useMemo(() => createColumns(navigate), [navigate]);

  if (isWorkflowsLoading) {
    return <InsetLoading title="Workflows" />;
  }

  if (workflowsError) {
    return (
      <InsetError title="Workflows" errorMessage={workflowsError.message} />
    );
  }

  return (
    <InsetLayout title="Workflows">
      <AdminTableToolbar
        searchPlaceholder="Search by name..."
        search={formProps}
      >
        {organizationId && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchParams({});
              setPage(1);
            }}
          >
            Clear organization filter
          </Button>
        )}
      </AdminTableToolbar>

      <DataTable
        columns={columns}
        data={workflows}
        emptyState={{
          title: "No workflows found",
          description: search
            ? "No workflows match your search."
            : "No workflows have been created yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={workflows.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="workflows"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
