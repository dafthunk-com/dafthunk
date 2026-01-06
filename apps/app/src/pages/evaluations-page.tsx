import type { Evaluation } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect } from "react";
import { Link } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useEvaluations } from "@/services/evaluation-service";

const createColumns = (
  getOrgUrl: (path: string) => string
): ColumnDef<Evaluation>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const id = row.original.id;
      return (
        <Link to={getOrgUrl(`evaluations/${id}`)} className="hover:underline">
          {name}
        </Link>
      );
    },
  },
  {
    accessorKey: "deploymentId",
    header: "Deployment",
    cell: ({ row }) => {
      const deploymentId = row.getValue("deploymentId") as string;
      return (
        <Link
          to={getOrgUrl(`deployment/${deploymentId}`)}
          className="hover:underline"
        >
          <Badge variant="outline" className="text-xs font-mono">
            {deploymentId.slice(0, 8)}
          </Badge>
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusColors = {
        pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        completed: "bg-green-500/10 text-green-700 dark:text-green-400",
        failed: "bg-red-500/10 text-red-700 dark:text-red-400",
      };
      return (
        <Badge
          variant="outline"
          className={statusColors[status as keyof typeof statusColors]}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "scores",
    header: "Scores",
    cell: ({ row }) => {
      const scores = row.original.scores;
      if (!scores) return <span className="text-muted-foreground">-</span>;

      return (
        <div className="flex gap-2">
          {Object.entries(scores).map(([key, value]) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {key}: {typeof value === "number" ? value.toFixed(2) : value}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </span>
      );
    },
  },
];

export function EvaluationsPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  // Set breadcrumbs on component mount
  useEffect(() => {
    setBreadcrumbs([{ label: "Evaluations" }]);
  }, [setBreadcrumbs]);

  const { evaluations, evaluationsError, isEvaluationsLoading } =
    useEvaluations();

  if (isEvaluationsLoading) {
    return <InsetLoading title="Evaluations" />;
  } else if (evaluationsError) {
    return (
      <InsetError title="Evaluations" errorMessage={evaluationsError.message} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Evaluations">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Track and analyze evaluations of your deployed workflows.
          </div>
        </div>
        <DataTable
          columns={createColumns(getOrgUrl)}
          data={evaluations}
          emptyState={{
            title: "No evaluations found",
            description:
              "Create an evaluation to test your deployed workflows.",
          }}
        />
      </InsetLayout>
    </TooltipProvider>
  );
}
