import { IdCard, Workflow } from "lucide-react";
import { Link } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrgUrl } from "@/hooks/use-org-url";

interface WorkflowInfoCardProps {
  id: string;
  name: string;
  description?: string;
}

export function WorkflowInfoCard({
  id,
  name,
  description = "Details about this workflow",
}: WorkflowInfoCardProps) {
  const { getOrgUrl } = useOrgUrl();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Workflow Information</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Column - Name */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <Workflow className="mr-1 h-4 w-4" /> Workflow Name
              </p>
              <p className="mt-1">
                <Link
                  to={getOrgUrl(`workflows/${id}`)}
                  className="hover:underline font-medium"
                >
                  {name}
                </Link>
              </p>
            </div>
          </div>

          {/* Second Column - UUID */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                <IdCard className="mr-1 h-4 w-4" /> Workflow UUID
              </p>
              <p className="mt-1">
                <Link
                  to={getOrgUrl(`workflows/${id}`)}
                  className="hover:underline font-mono text-xs"
                >
                  {id}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
