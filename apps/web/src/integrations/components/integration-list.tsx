import type { Integration } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { DataTable } from "@/components/ui/data-table";

import { getProviderLabel } from "../providers";
import { IntegrationActions } from "./integration-actions";

interface IntegrationListProps {
  integrations: Integration[];
  onDelete: (integrationId: string) => void;
}

export function IntegrationList({
  integrations,
  onDelete,
}: IntegrationListProps) {
  const columns: ColumnDef<Integration>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => {
        const providerId = row.getValue("provider") as Integration["provider"];
        return <div>{getProviderLabel(providerId)}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return <div>{format(date, "MMM d, yyyy")}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <IntegrationActions integration={row.original} onDelete={onDelete} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={integrations}
      emptyState={{
        title: "No integrations found",
        description: "Create your first integration to get started.",
      }}
    />
  );
}
