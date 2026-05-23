import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableToolbar } from "@/components/admin/admin-table-toolbar";
import { createOrgScopedColumns } from "@/components/admin/org-scoped-columns";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useAdminSearch } from "@/hooks/use-admin-search";
import {
  type AdminDatabase,
  useAdminDatabases,
} from "@/services/admin-service";

export function AdminDatabasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Databases" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { databases, pagination, databasesError, isDatabasesLoading } =
    useAdminDatabases(page, limit, search || undefined, organizationId);

  const columns = useMemo(
    () => createOrgScopedColumns<AdminDatabase>(navigate),
    [navigate]
  );

  if (isDatabasesLoading) {
    return <InsetLoading title="Databases" />;
  }

  if (databasesError) {
    return (
      <InsetError title="Databases" errorMessage={databasesError.message} />
    );
  }

  return (
    <InsetLayout title="Databases">
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
        data={databases}
        emptyState={{
          title: "No databases found",
          description: search
            ? "No databases match your search."
            : "No databases have been created yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={databases.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="databases"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
