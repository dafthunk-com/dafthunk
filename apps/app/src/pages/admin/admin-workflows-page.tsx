import Search from "lucide-react/icons/search";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminWorkflows } from "@/services/admin-service";

export function AdminWorkflowsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    setBreadcrumbs([{ label: "Workflows" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { workflows, pagination, workflowsError, isWorkflowsLoading } =
    useAdminWorkflows(page, limit, search || undefined, organizationId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

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
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or handle..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
        {organizationId && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchParams({});
              setPage(1);
            }}
          >
            Clear Organization Filter
          </Button>
        )}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Runtime</TableHead>
              <TableHead>Deployed</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {workflow.handle}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/admin/organizations/${workflow.organizationId}`}
                    className="hover:underline"
                  >
                    {workflow.organizationName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{workflow.trigger}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{workflow.runtime}</Badge>
                </TableCell>
                <TableCell>
                  {workflow.activeDeploymentId ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {workflows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {search
                    ? "No workflows found matching your search"
                    : "No workflows found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
            workflows
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
              disabled={page === pagination.totalPages}
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
