import type { Edge as ReactFlowEdge } from "@xyflow/react";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import { useState } from "react";

import { Label } from "@/components/ui/label";

import type { WorkflowEdgeType } from "./workflow-types";

export interface WorkflowEdgeInspectorProps {
  edge: ReactFlowEdge<WorkflowEdgeType> | null;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  disabled?: boolean;
}

export function WorkflowEdgeInspector({
  edge,
  disabled: _disabled = false,
}: WorkflowEdgeInspectorProps) {
  // Collapsible section state
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);

  if (!edge) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Connection Properties Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setPropertiesExpanded(!propertiesExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">
              Connection Properties
            </h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted-foreground ${
                propertiesExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {propertiesExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {/* Source Section */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Source
                </Label>
                <div className="text-sm text-foreground mt-1 font-mono">
                  {edge.source}
                </div>
              </div>

              {/* Target Section */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Target
                </Label>
                <div className="text-sm text-foreground mt-1 font-mono">
                  {edge.target}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
