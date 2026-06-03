import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { AdminPagination } from "@/components/admin/admin-pagination";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { InsetError } from "@/components/inset-error";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type AdminStuckUser,
  LIST_STAGE_LABEL,
  LIST_STAGES,
  type ListStage,
  useAdminStuckSummary,
  useAdminStuckUsers,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";

// Stage tabs are bounded above by the server-side dormancy cap (30d),
// so a threshold of 30+ would always be empty. Dormant cohort surfaces
// the 30+ users in their own tab.
const THRESHOLD_OPTIONS = [3, 7, 14];

function createColumns(
  navigate: ReturnType<typeof useNavigate>
): ColumnDef<AdminStuckUser>[] {
  return [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <Link
          to={`/admin/users/${row.original.id}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatarUrl || undefined} />
            <AvatarFallback>
              {row.original.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span>{row.original.name}</span>
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) =>
        row.original.email ? (
          <span className="text-muted-foreground">{row.original.email}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => (
        <Badge variant={row.original.plan === "pro" ? "default" : "secondary"}>
          {row.original.plan}
        </Badge>
      ),
    },
    {
      accessorKey: "furthestStageAt",
      header: "Stuck since",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.furthestStageAt)}
        </span>
      ),
    },
    {
      accessorKey: "daysSinceAdvance",
      header: "Days",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.daysSinceAdvance}d</Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActionsMenu>
          <DropdownMenuItem
            onClick={() =>
              navigate(`/admin/users/${row.original.id}?compose=draft`)
            }
          >
            Draft message
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(`/admin/users/${row.original.id}`)}
          >
            View user
          </DropdownMenuItem>
        </RowActionsMenu>
      ),
    },
  ];
}

export function AdminStuckUsersPage() {
  const [minDays, setMinDays] = useState(7);
  const [stage, setStage] = useState<ListStage>("workflow_created");
  const [page, setPage] = useState(1);
  const isDormantTab = stage === "dormant";
  const limit = 20;
  const setBreadcrumbs = useBreadcrumbsSetter();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([{ label: "Stuck in funnel" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const { stuckSummary, stuckSummaryError } = useAdminStuckSummary(minDays);
  const { stuckUsers, pagination, stuckUsersError } = useAdminStuckUsers(
    stage,
    minDays,
    page,
    limit
  );

  const columns = useMemo(() => createColumns(navigate), [navigate]);

  if (stuckSummaryError) {
    return (
      <InsetError
        title="Stuck in funnel"
        errorMessage={stuckSummaryError.message}
      />
    );
  }

  const onStageChange = (next: string) => {
    setStage(next as ListStage);
    setPage(1);
  };

  const onThresholdChange = (next: string) => {
    setMinDays(Number(next));
    setPage(1);
  };

  return (
    <InsetLayout title="Onboarding">
      <p className="text-sm text-muted-foreground mb-4">
        {isDormantTab
          ? `Pre-activation users idle ${stuckSummary?.dormantDays ?? 30}+ days. Drafted messages skip past correspondence and use a re-engagement tone.`
          : `Users who reached an onboarding stage more than ${minDays} day${minDays === 1 ? "" : "s"} ago and have not advanced (capped at <${stuckSummary?.dormantDays ?? 30}d — older users move to Dormant).`}
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <Tabs value={stage} onValueChange={onStageChange}>
          <TabsList>
            {LIST_STAGES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {LIST_STAGE_LABEL[s]}
                <span className="ml-2 text-xs text-muted-foreground">
                  {stuckSummary?.counts[s] ?? "—"}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!isDormantTab && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Stuck for</span>
            <Select value={String(minDays)} onValueChange={onThresholdChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THRESHOLD_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}+ days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {stuckUsersError ? (
        <InsetError
          title="Stuck in funnel"
          errorMessage={stuckUsersError.message}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={stuckUsers}
            emptyState={{
              title: isDormantTab ? "No dormant users" : "Nobody is stuck here",
              description: isDormantTab
                ? "No pre-activation users have been idle long enough yet."
                : `No users at "${LIST_STAGE_LABEL[stage]}" past ${minDays} days. Try a shorter threshold or a different stage.`,
            }}
          />

          <AdminPagination
            page={page}
            limit={limit}
            itemCount={stuckUsers.length}
            total={pagination?.total}
            totalPages={pagination?.totalPages}
            itemLabel="users"
            onPageChange={setPage}
          />
        </>
      )}
    </InsetLayout>
  );
}
