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
import { useAdminDeployments } from "@/services/admin-service";

export function AdminDeploymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    setBreadcrumbs([{ label: "Deployments" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;
  const workflowId = searchParams.get("workflowId") || undefined;

  const { deployments, pagination, deploymentsError, isDeploymentsLoading } =
    useAdminDeployments(
      page,
      limit,
      search || undefined,
      organizationId,
      workflowId
    );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  if (isDeploymentsLoading) {
    return <InsetLoading title="Deployments" />;
  }

  if (deploymentsError) {
    return (
      <InsetError title="Deployments" errorMessage={deploymentsError.message} />
    );
  }

  return (
    <InsetLayout title="Deployments">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by workflow name..."
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
        {(organizationId || workflowId) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchParams({});
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        )}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell>
                  {deployment.workflowName ? (
                    <div>
                      <div className="font-medium">
                        {deployment.workflowName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {deployment.workflowHandle}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Deleted workflow
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/admin/organizations/${deployment.organizationId}`}
                    className="hover:underline"
                  >
                    {deployment.organizationName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">v{deployment.version}</Badge>
                </TableCell>
                <TableCell>
                  {deployment.isActive ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(deployment.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {deployments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {search
                    ? "No deployments found matching your search"
                    : "No deployments found"}
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
            deployments
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
