import { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";

export interface Parameter {
  id: string;
  type: string;
  label: string;
  value?: any;
}

type NodeExecutionState = "idle" | "executing" | "completed" | "error";

export interface WorkflowNodeData {
  label: string;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string | null;
  executionState: NodeExecutionState;
}

const TypeBadge = ({
  type,
  position,
  id,
  hasValue = false,
}: {
  type: string;
  position: Position;
  id: string;
  hasValue?: boolean;
}) => {
  const label = type.charAt(0).toUpperCase();
  return (
    <div className="relative inline-flex items-center justify-center">
      <Handle
        type={position === Position.Left ? "target" : "source"}
        position={position}
        id={id}
        className="opacity-0 !w-full !h-full !bg-transparent !border-none !absolute !left-0 !top-0 !transform-none !m-0 !z-[1000]"
      />
      <span
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium relative z-[1] cursor-pointer transition-colors",
          hasValue
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
      >
        {label}
      </span>
    </div>
  );
};

export const WorkflowNode = memo(
  ({ data, selected }: { data: WorkflowNodeData; selected?: boolean }) => {
    const [showOutputs, setShowOutputs] = useState(false);
    const hasOutputValues = data.outputs.some(
      (output) => output.value !== undefined
    );

    return (
      <div
        className={cn(
          "bg-white shadow-sm w-[200px] rounded-lg border-[1px] transition-colors overflow-hidden",
          {
            "border-blue-500": selected,
            "border-gray-300": !selected && data.executionState === "idle",
            "border-yellow-400": data.executionState === "executing",
            "border-green-500": data.executionState === "completed",
            "border-red-500": data.executionState === "error",
          }
        )}
      >
        {/* Header */}
        <div className="p-1 text-center">
          <h3 className="m-0 text-xs font-medium">{data.label}</h3>
        </div>

        {/* Parameters */}
        <div className="px-1 pb-1 grid grid-cols-2 justify-between gap-2.5">
          {/* Input Parameters */}
          <div className="flex flex-col gap-1 flex-1">
            {data.inputs.map((input, index) => (
              <div
                key={`input-${input.id}-${index}`}
                className="flex items-center gap-1 text-xs relative"
              >
                <TypeBadge
                  type={input.type}
                  position={Position.Left}
                  id={input.id}
                />
                <p className="overflow-hidden text-ellipsis">{input.label}</p>
              </div>
            ))}
          </div>

          {/* Output Parameters */}
          <div className="flex flex-col gap-1 flex-1 items-end">
            {data.outputs.map((output, index) => (
              <div
                key={`output-${output.id}-${index}`}
                className="flex items-center gap-1 text-xs relative"
              >
                <p className="overflow-hidden text-ellipsis">{output.label}</p>
                <TypeBadge
                  type={output.type}
                  position={Position.Right}
                  id={output.id}
                  hasValue={output.value !== undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Output Values Section - Only show if there are output values */}
        {hasOutputValues && (
          <>
            <div
              className="px-2 py-1 border-t border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => setShowOutputs(!showOutputs)}
            >
              <span className="text-xs font-medium text-gray-600">Outputs</span>
              {showOutputs ? (
                <ChevronUp className="h-3 w-3 text-gray-500" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gray-500" />
              )}
            </div>

            {showOutputs && (
              <div className="px-2 py-1 border-t border-gray-200 space-y-2">
                {data.outputs.map(
                  (output, index) =>
                    output.value !== undefined && (
                      <div
                        key={`output-value-${output.id}-${index}`}
                        className="space-y-1"
                      >
                        <div className="text-xs font-medium">
                          {output.label}
                        </div>
                        <WorkflowOutputRenderer
                          output={output}
                          compact={true}
                        />
                      </div>
                    )
                )}
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {data.error && (
          <div className="p-2 bg-red-50 text-red-600 text-xs border-t border-red-200">
            <p className="m-0">{data.error}</p>
          </div>
        )}
      </div>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
