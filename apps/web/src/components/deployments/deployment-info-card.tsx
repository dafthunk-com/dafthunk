import { format } from "date-fns";
import ArrowUpToLine from "lucide-react/icons/arrow-up-to-line";
import Clock from "lucide-react/icons/clock";
import GitCommitHorizontal from "lucide-react/icons/git-commit-horizontal";
import IdCard from "lucide-react/icons/id-card";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrgUrl } from "@/hooks/use-org-url";

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
  const { getOrgUrl } = useOrgUrl();
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
                <GitCommitHorizontal className="mr-1 h-4 w-4" /> Deployment
                Version
              </p>
              <div className="mt-1">
                <Link
                  to={getOrgUrl(`workflows/deployment/${id}`)}
                  className="hover:underline"
                >
                  <Badge variant="secondary" className="text-xs gap-1">
                    <GitCommitHorizontal className="h-3.5 w-3.5" />v{version}
                  </Badge>
                </Link>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <IdCard className="mr-1 h-4 w-4" /> Deployment UUID
              </p>
              <p className="mt-1">
                <Link
                  to={getOrgUrl(`workflows/deployment/${id}`)}
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
                    to={getOrgUrl(`workflows/${workflowId}`)}
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
