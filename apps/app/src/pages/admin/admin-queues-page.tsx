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
import { type AdminQueue, useAdminQueues } from "@/services/admin-service";

export function AdminQueuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Queues" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { queues, pagination, queuesError, isQueuesLoading } = useAdminQueues(
    page,
    limit,
    search || undefined,
    organizationId
  );

  const columns = useMemo(
    () => createOrgScopedColumns<AdminQueue>(navigate),
    [navigate]
  );

  if (isQueuesLoading) {
    return <InsetLoading title="Queues" />;
  }

  if (queuesError) {
    return <InsetError title="Queues" errorMessage={queuesError.message} />;
  }

  return (
    <InsetLayout title="Queues">
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
        data={queues}
        emptyState={{
          title: "No queues found",
          description: search
            ? "No queues match your search."
            : "No queues have been created yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={queues.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="queues"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
