import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, IdCard, ArrowUpToLine, GitCommitHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface DeploymentInfoCardProps {
  id: string;
  version: number | string;
  createdAt: string | Date;
  title?: string;
  description?: string;
  workflowId?: string;
}

export function DeploymentInfoCard({
  id,
  version,
  createdAt,
  title = "Deployment Information",
  description = "Details about this deployment version",
  workflowId,
}: DeploymentInfoCardProps) {
  const formatDate = (dateString: string | Date) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (_error) {
      return String(dateString);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Column - References */}
          <div className="space-y-4">
            <div>
            <p className="text-sm text-muted-foreground flex items-center">
                <GitCommitHorizontal className="mr-1 h-4 w-4" /> Deployment Version
              </p>
              <p className="mt-1">
                <Link
                  to={`/workflows/deployments/version/${id}`}
                  className="hover:underline"
                >
                  <Badge variant="secondary" className="text-xs gap-1">
                    <GitCommitHorizontal className="h-3.5 w-3.5" />v{version}
                  </Badge>
                </Link>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <IdCard className="mr-1 h-4 w-4" /> Deployment UUID
              </p>
              <p className="mt-1">
                <Link
                  to={`/workflows/deployments/version/${id}`}
                  className="hover:underline font-mono text-xs"
                >
                  {id}
                </Link>
              </p>
            </div>
          </div>

          {/* Second Column - Timing */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <Clock className="mr-1 h-4 w-4" /> Created At
              </p>
              <p className="mt-1">{formatDate(createdAt)}</p>
            </div>
            {workflowId && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <ArrowUpToLine className="mr-1 h-4 w-4" /> Workflow UUID
                </p>
                <p className="mt-1">
                  <Link
                    to={`/workflows/playground/${workflowId}`}
                    className="hover:underline font-mono text-xs"
                  >
                    {workflowId}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
