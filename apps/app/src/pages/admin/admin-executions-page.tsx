import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminExecutions } from "@/services/admin-service";

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

export function AdminExecutionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    setBreadcrumbs([{ label: "Executions" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { executions, executionsError, isExecutionsLoading } =
    useAdminExecutions(
      page,
      limit,
      organizationId,
      undefined,
      status === "all" ? undefined : status
    );

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
      <div className="flex gap-2 mb-4">
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
            onClick={() => {
              setSearchParams({});
              setPage(1);
            }}
          >
            Clear Organization Filter
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Ended</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((execution) => (
              <TableRow key={execution.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{execution.workflowName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {execution.id.substring(0, 8)}...
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/admin/organizations/${execution.organizationId}`}
                    className="hover:underline"
                  >
                    {execution.organizationName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(execution.status)}>
                    {execution.status}
                  </Badge>
                </TableCell>
                <TableCell>{execution.usage}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(execution.startedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {execution.endedAt
                    ? new Date(execution.endedAt).toLocaleString()
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
            {executions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No executions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(executions.length > 0 || page > 1) && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {executions.length} execution
            {executions.length !== 1 ? "s" : ""} on page {page}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={executions.length < limit}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </InsetLayout>
  );
}
