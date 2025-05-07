import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Hash, GitCommitHorizontal } from "lucide-react";
import { format } from "date-fns";

interface DeploymentInfoCardProps {
  id: string;
  version: number | string;
  createdAt: string | Date;
  title?: string;
  description?: string;
}

export function DeploymentInfoCard({
  id,
  version,
  createdAt,
  title = "Deployment Information",
  description = "Details about this deployment version",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center">
              <Hash className="mr-1 h-4 w-4" /> Deployment ID
            </p>
            <p className="font-mono text-sm mt-1">{id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center">
              <Clock className="mr-1 h-4 w-4" /> Deployed
            </p>
            <p className="mt-1">{formatDate(createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Version</p>
            <p className="mt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <GitCommitHorizontal className="h-3.5 w-3.5" />v{version}
              </Badge>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
