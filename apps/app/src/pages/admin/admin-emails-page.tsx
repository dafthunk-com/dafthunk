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
import { type AdminEmail, useAdminEmails } from "@/services/admin-service";

export function AdminEmailsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { query: search, formProps } = useAdminSearch(() => setPage(1));
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Emails" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { emails, pagination, emailsError, isEmailsLoading } = useAdminEmails(
    page,
    limit,
    search || undefined,
    organizationId
  );

  const columns = useMemo(
    () => createOrgScopedColumns<AdminEmail>(navigate),
    [navigate]
  );

  if (isEmailsLoading) {
    return <InsetLoading title="Emails" />;
  }

  if (emailsError) {
    return <InsetError title="Emails" errorMessage={emailsError.message} />;
  }

  return (
    <InsetLayout title="Emails">
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
        data={emails}
        emptyState={{
          title: "No emails found",
          description: search
            ? "No emails match your search."
            : "No emails have been created yet.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={emails.length}
        total={pagination?.total}
        totalPages={pagination?.totalPages}
        itemLabel="emails"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
