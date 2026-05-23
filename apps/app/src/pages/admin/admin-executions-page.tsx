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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminExecution,
  useAdminExecutions,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "error", label: "Error" },
  { value: "cancelled", label: "Cancelled" },
];

function getStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default";
    case "running":
      return "secondary";
    case "error":
      return "destructive";
    case "cancelled":
      return "outline";
    default:
      return "outline";
  }
}

function createColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminExecution>[] {
  return [
    {
      accessorKey: "workflowName",
      header: "Workflow",
      cell: ({ row }) => (
        <Link
          to={`/admin/executions/${row.original.id}?organizationId=${row.original.organizationId}`}
          className="font-medium hover:underline"
        >
          {row.original.workflowName}
        </Link>
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "usage",
      header: "Usage",
    },
    {
      accessorKey: "startedAt",
      header: "Started",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.startedAt)}
        </span>
      ),
    },
    {
      accessorKey: "endedAt",
      header: "Ended",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.endedAt ? formatDate(row.original.endedAt) : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsMenu>
          <DropdownMenuItem
            onClick={() =>
              navigate(
                `/admin/executions/${row.original.id}?organizationId=${row.original.organizationId}`
              )
            }
          >
            View execution
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              navigate(`/admin/workflows/${row.original.workflowId}`)
            }
          >
            View workflow
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

export function AdminExecutionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Executions" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;
  const workflowId = searchParams.get("workflowId") || undefined;

  const { executions, executionsError, isExecutionsLoading } =
    useAdminExecutions(
      page,
      limit,
      organizationId,
      workflowId,
      status === "all" ? undefined : status
    );

  const clearParam = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
    setPage(1);
  };

  const columns = useMemo(() => createColumns(navigate), [navigate]);

  if (isExecutionsLoading) {
    return <InsetLoading title="Executions" />;
  }

  if (executionsError) {
    return (
      <InsetError title="Executions" errorMessage={executionsError.message} />
    );
  }

  return (
    <InsetLayout title="Executions">
      <AdminTableToolbar>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {organizationId && (
          <Button
            variant="outline"
            onClick={() => clearParam("organizationId")}
          >
            Clear organization filter
          </Button>
        )}
        {workflowId && (
          <Button variant="outline" onClick={() => clearParam("workflowId")}>
            Clear workflow filter
          </Button>
        )}
      </AdminTableToolbar>

      <DataTable
        columns={columns}
        data={executions}
        emptyState={{
          title: "No executions found",
          description: "No executions match the current filters.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={executions.length}
        itemLabel="executions"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
