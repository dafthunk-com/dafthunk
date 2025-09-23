import { WorkflowExecutionStatus } from "@dafthunk/types";
import { format } from "date-fns";
import AlertCircle from "lucide-react/icons/alert-circle";
import Clock from "lucide-react/icons/clock";
import Eye from "lucide-react/icons/eye";
import EyeOff from "lucide-react/icons/eye-off";
import IdCard from "lucide-react/icons/id-card";
import Workflow from "lucide-react/icons/workflow";
import { Link } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrgUrl } from "@/hooks/use-org-url";
import { cn } from "@/utils/utils";

import { Badge } from "../ui/badge";
import { ExecutionStatusBadge } from "./execution-status-badge";

interface ExecutionInfoCardProps {
  id: string;
  status: WorkflowExecutionStatus;
  visibility: "public" | "private";
  startedAt?: Date;
  endedAt?: Date;
  workflowId: string;
  workflowName?: string;
  deploymentId?: string;
  error?: string;
  title?: string;
  description?: string;
}

export function ExecutionInfoCard({
  id,
  status,
  visibility,
  startedAt,
  endedAt,
  workflowId,
  workflowName,
  deploymentId,
  error,
  title = "Execution Information",
  description = "Details about this workflow execution",
}: ExecutionInfoCardProps) {
  const { getOrgUrl } = useOrgUrl();
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (_error) {
      return String(dateString);
    }
  };

  const calculateDuration = (
    startedAt?: string | Date,
    endedAt?: string | Date
  ) => {
    if (!startedAt || !endedAt) return "N/A";
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {visibility && (
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  visibility === "public"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "bg-gray-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                )}
              >
                {visibility === "public" ? (
                  <Eye className="mr-1 size-3" />
                ) : (
                  <EyeOff className="mr-1 size-3" />
                )}
                {visibility}
              </Badge>
            )}
            <ExecutionStatusBadge status={status as any} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Column - References */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <Workflow className="mr-1 h-4 w-4" /> Workflow Name
              </p>
              <p className="mt-1">
                {workflowName ? (
                  <Link
                    to={getOrgUrl(`workflows/${workflowId}`)}
                    className="hover:underline text-primary"
                  >
                    {workflowName}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{workflowId}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <IdCard className="mr-1 h-4 w-4" /> Workflow UUID
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
            {deploymentId && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <IdCard className="mr-1 h-4 w-4" /> Deployment UUID
                </p>
                <p className="mt-1">
                  <Link
                    to={getOrgUrl(`workflows/deployment/${deploymentId}`)}
                    className="hover:underline text-primary font-mono text-xs"
                  >
                    {deploymentId}
                  </Link>
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <IdCard className="mr-1 h-4 w-4" /> Execution UUID
              </p>
              <p className="mt-1">
                <Link
                  to={getOrgUrl(`workflows/executions/${id}`)}
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
                <Clock className="mr-1 h-4 w-4" /> Started At
              </p>
              <p className="mt-1">{formatDate(startedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <Clock className="mr-1 h-4 w-4" /> Completed At
              </p>
              <p className="mt-1">{formatDate(endedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <Clock className="mr-1 h-4 w-4" /> Duration
              </p>
              <p className="mt-1">{calculateDuration(startedAt, endedAt)}</p>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-4 border border-destructive/20 bg-destructive/10 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Error</p>
                <p className="text-sm font-mono whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
