import { ColumnDef } from "@tanstack/react-table";
import { WorkflowDeploymentVersion } from "@dafthunk/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Eye, GitCommitHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

// Format a date string helper
export const formatDeploymentDate = (dateString: string | Date) => {
  try {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  } catch (_error) {
    return String(dateString);
  }
};

// Create columns with the current deployment ID highlighted
export const createDeploymentHistoryColumns = (
  currentDeploymentId: string
): ColumnDef<WorkflowDeploymentVersion>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => {
      const deployment = row.original;
      const isCurrent = deployment.id === currentDeploymentId;

      return (
        <div className="font-mono text-xs">
          {isCurrent ? (
            <div className="flex items-center">
              {deployment.id}
              <Badge variant="outline" className="ml-2 bg-green-50">
                Current
              </Badge>
            </div>
          ) : (
            <>{deployment.id}</>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "version",
    header: "Version",
    cell: ({ row }) => (
      <Badge variant="secondary" className="gap-1">
        <GitCommitHorizontal className="h-3.5 w-3.5" />v{row.original.version}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <div className="flex items-center">
        <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
        {formatDeploymentDate(row.original.createdAt)}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Link to={`/workflows/deployments/version/${row.original.id}`}>
        <Button size="sm" variant="ghost">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </Link>
    ),
  },
];
