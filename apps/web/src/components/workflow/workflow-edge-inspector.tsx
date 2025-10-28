import type { Edge as ReactFlowEdge } from "@xyflow/react";

import { Label } from "@/components/ui/label";

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
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">
          {readonly
            ? "Connection Properties (Read-only)"
            : "Connection Properties"}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Source Section */}
        <div className="px-4 py-3 border-b border-border">
          <Label className="text-xs font-medium text-muted-foreground">
            Source
          </Label>
          <div className="text-sm text-foreground mt-1 font-mono">
            {edge.source}
          </div>
        </div>

        {/* Target Section */}
        <div className="px-4 py-3 border-b border-border">
          <Label className="text-xs font-medium text-muted-foreground">
            Target
          </Label>
          <div className="text-sm text-foreground mt-1 font-mono">
            {edge.target}
          </div>
        </div>
      </div>
    </div>
  );
}
