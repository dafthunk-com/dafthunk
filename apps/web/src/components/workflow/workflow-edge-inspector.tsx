import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Edge as ReactFlowEdge } from "@xyflow/react";
import type { WorkflowEdgeType } from "./workflow-types";

export interface WorkflowEdgeInspectorProps {
  edge: ReactFlowEdge<WorkflowEdgeType> | null;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  readonly?: boolean;
}

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
