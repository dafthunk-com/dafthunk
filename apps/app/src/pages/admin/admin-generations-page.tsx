import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

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
  type AdminGeneration,
  useAdminGenerations,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

/**
 * What the generator did, across every workspace.
 *
 * Metadata only: the API records no prompt text, so this page cannot show what
 * anybody typed. The question it answers is which stage is failing and how
 * often — the thing per-session logs cannot tell you because each one is a
 * single case.
 */

const outcomeOptions = [
  { value: "all", label: "All Outcomes" },
  { value: "ok", label: "Ok" },
  { value: "partial", label: "Partial" },
  { value: "failed", label: "Failed" },
  { value: "crashed", label: "Crashed" },
  { value: "refused", label: "Refused" },
];

const stageOptions = [
  { value: "all", label: "All Stages" },
  { value: "select", label: "Select" },
  { value: "draft", label: "Draft" },
  { value: "hydrate", label: "Hydrate" },
  { value: "validate", label: "Validate" },
  { value: "save", label: "Save" },
  { value: "run", label: "Run" },
];

function getOutcomeVariant(outcome: string) {
  switch (outcome) {
    case "ok":
      return "default";
    case "partial":
      return "secondary";
    case "failed":
    case "crashed":
      return "destructive";
    default:
      return "outline";
  }
}

function createColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminGeneration>[] {
  return [
    {
      accessorKey: "outcome",
      header: "Outcome",
      cell: ({ row }) => (
        <Badge variant={getOutcomeVariant(row.original.outcome)}>
          {row.original.outcome}
        </Badge>
      ),
    },
    {
      accessorKey: "trigger",
      header: "Trigger",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.trigger || "—"}</span>
      ),
    },
    {
      id: "broke",
      header: "Broke at",
      cell: ({ row }) => {
        const { failedStage, fatalCodes, errorCode } = row.original;
        if (errorCode) {
          return <span className="text-sm">{errorCode}</span>;
        }
        if (!failedStage) return <span className="text-sm">—</span>;
        return (
          <span className="text-sm">
            {failedStage}
            {fatalCodes.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                ({fatalCodes.join(", ")})
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "repairs",
      header: "Repairs",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.repairs}</span>
      ),
    },
    {
      accessorKey: "nodeCount",
      header: "Nodes",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.nodeCount}</span>
      ),
    },
    {
      id: "tokens",
      header: "Tokens (in/out)",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.inputTokens.toLocaleString()} /{" "}
          {row.original.outputTokens.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "durationMs",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {(row.original.durationMs / 1000).toFixed(1)}s
        </span>
      ),
    },
    {
      accessorKey: "organizationName",
      header: "Organization",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.organizationName}</span>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "When",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.timestamp)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsMenu>
          {row.original.workflowId && (
            <DropdownMenuItem
              onClick={() =>
                navigate(`/admin/workflows/${row.original.workflowId}`)
              }
            >
              View workflow
            </DropdownMenuItem>
          )}
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

export function AdminGenerationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Generations" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const organizationId = searchParams.get("organizationId") || undefined;

  const { generations, generationsError, isGenerationsLoading } =
    useAdminGenerations(
      page,
      limit,
      organizationId,
      outcome === "all" ? undefined : outcome,
      stage === "all" ? undefined : stage
    );

  const clearParam = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
    setPage(1);
  };

  const columns = useMemo(() => createColumns(navigate), [navigate]);

  // Analytics Engine samples under load, so a row can stand for several
  // generations. Surfaced rather than hidden: a page that silently shows one
  // row per twenty generations reads as a quiet week.
  const sampled = generations.some((generation) => generation.weight > 1);

  if (isGenerationsLoading) {
    return <InsetLoading title="Generations" />;
  }

  if (generationsError) {
    return (
      <InsetError title="Generations" errorMessage={generationsError.message} />
    );
  }

  return (
    <InsetLayout title="Generations">
      <AdminTableToolbar>
        <Select
          value={outcome}
          onValueChange={(value) => {
            setOutcome(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by outcome" />
          </SelectTrigger>
          <SelectContent>
            {outcomeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={stage}
          onValueChange={(value) => {
            setStage(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
      </AdminTableToolbar>

      {sampled && (
        <p className="text-sm text-muted-foreground mb-2">
          Some rows are sampled and stand for more than one generation.
        </p>
      )}

      <DataTable
        columns={columns}
        data={generations}
        emptyState={{
          title: "No generations found",
          description: "No generations match the current filters.",
        }}
      />

      <AdminPagination
        page={page}
        limit={limit}
        itemCount={generations.length}
        itemLabel="generations"
        onPageChange={setPage}
      />
    </InsetLayout>
  );
}
