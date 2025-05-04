import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Hash } from "lucide-react";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Information</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center">
              <Hash className="mr-1 h-4 w-4" /> Workflow ID
            </p>
            <p className="font-mono text-sm mt-1">{id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="mt-1 font-medium">{name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
