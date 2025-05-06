import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { WorkflowEdgeInspectorProps } from "./workflow-types";

export function WorkflowEdgeInspector({
  edge,
  readonly = false,
}: WorkflowEdgeInspectorProps) {
  if (!edge) return null;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          {readonly
            ? "Connection Properties (Read-only)"
            : "Connection Properties"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <div className="text-sm">{edge.source}</div>
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <div className="text-sm">{edge.target}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
