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
import { type AdminDataset, useAdminDatasets } from "@/services/admin-service";

export function AdminDatasetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Datasets" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { datasets, pagination, datasetsError, isDatasetsLoading } =
    useAdminDatasets(page, limit, search || undefined, organizationId);

  const columns = useMemo(
    () => createOrgScopedColumns<AdminDataset>(navigate),
    [navigate]
  );

  if (isDatasetsLoading) {
    return <InsetLoading title="Datasets" />;
  }

  if (datasetsError) {
    return <InsetError title="Datasets" errorMessage={datasetsError.message} />;
  }

  return (
    <InsetLayout title="Datasets">
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
        data={datasets}
        emptyState={{
          title: "No datasets found",
          description: search
            ? "No datasets match your search."
            : "No datasets have been created yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={datasets.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="datasets"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
