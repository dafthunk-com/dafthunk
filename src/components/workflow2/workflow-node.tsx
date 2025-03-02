import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type NodeExecutionState = "idle" | "executing" | "completed" | "error";

export interface WorkflowNodeData {
  label: string;
  inputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  outputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  error?: string | null;
  executionState: NodeExecutionState;
}

const TypeBadge = ({
  type,
  position,
  id,
}: {
  type: string;
  position: Position;
  id: string;
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
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs font-medium relative z-[1] cursor-pointer transition-colors hover:bg-gray-200">
        {label}
      </span>
    </div>
  );
};

export const WorkflowNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div
      className={cn(
        "bg-white shadow-sm w-[200px] rounded-lg border-[1px] transition-colors",
        {
          "border-blue-500": selected,
          "border-gray-300": !selected && data.executionState === "idle",
          "border-yellow-400 animate-pulse":
            data.executionState === "executing",
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
      <div className="px-1 pb-1 flex justify-between gap-4">
        {/* Input Parameters */}
        <div className="flex flex-col gap-1 flex-1">
          {data.inputs.map((input) => (
            <div
              key={`input-${input.id}`}
              className="flex items-center gap-1 text-xs relative"
            >
              <TypeBadge
                type={input.type}
                position={Position.Left}
                id={input.id}
              />
              {input.label}
            </div>
          ))}
        </div>

        {/* Output Parameters */}
        <div className="flex flex-col gap-1 flex-1 items-end">
          {data.outputs.map((output) => (
            <div
              key={`output-${output.id}`}
              className="flex items-center gap-1 text-xs relative"
            >
              {output.label}
              <TypeBadge
                type={output.type}
                position={Position.Right}
                id={output.id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {data.error && (
        <div className="p-2 bg-red-50 text-red-600 text-xs">
          <p className="m-0">{data.error}</p>
        </div>
      )}
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode"; 