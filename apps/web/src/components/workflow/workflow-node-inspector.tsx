import type { ObjectReference } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";
import { EyeIcon, EyeOffIcon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";

import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  updateNodeName,
  useWorkflow,
} from "./workflow-context";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import type { WorkflowParameter } from "./workflow-types";
import type { WorkflowNodeType } from "./workflow-types";

export interface WorkflowNodeInspectorProps {
  node: ReactFlowNode<WorkflowNodeType> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  readonly?: boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
}

export function WorkflowNodeInspector({
  node,
  onNodeUpdate,
  createObjectUrl,
  readonly = false,
}: WorkflowNodeInspectorProps) {
  const { updateNodeData: contextUpdateNodeData } = useWorkflow();

  // Prefer the context function but fall back to the prop if needed
  const updateNodeData = onNodeUpdate || contextUpdateNodeData;

  // Create local state to immediately reflect changes in the UI
  const [localName, setLocalName] = useState<string>(node?.data.name || "");
  const [localInputs, setLocalInputs] = useState<readonly WorkflowParameter[]>(
    node?.data.inputs || []
  );
  const [localOutputs, setLocalOutputs] = useState<
    readonly WorkflowParameter[]
  >(node?.data.outputs || []);

  // Update local state when node changes
  useEffect(() => {
    if (!node) return;

    setLocalName(node.data.name);
    setLocalInputs(node.data.inputs);
    setLocalOutputs(node.data.outputs);
  }, [node]);

  if (!node) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly) return;

    const newName = e.target.value;
    setLocalName(newName);
    updateNodeName(node.id, newName, updateNodeData);
  };

  const handleInputValueChange = (inputId: string, value: string) => {
    if (readonly || !updateNodeData) return;

    const input = localInputs.find((i) => i.id === inputId);
    if (!input) return;

    const typedValue = convertValueByType(value, input.type || "string");

    const updatedInputs = updateNodeInput(
      node.id,
      inputId,
      typedValue,
      localInputs,
      updateNodeData
    );

    setLocalInputs(updatedInputs);
  };

  const handleClearValue = (inputId: string) => {
    if (readonly || !updateNodeData) return;

    const updatedInputs = clearNodeInput(
      node.id,
      inputId,
      localInputs,
      updateNodeData
    );

    setLocalInputs(updatedInputs);
  };

  const handleToggleVisibility = (inputId: string) => {
    if (readonly || !updateNodeData) return;

    const updatedInputs = localInputs.map((input) =>
      input.id === inputId ? { ...input, hidden: !input.hidden } : input
    );

    updateNodeData(node.id, {
      ...node.data,
      inputs: updatedInputs,
    });

    setLocalInputs(updatedInputs);
  };

  const handleToggleOutputVisibility = (outputId: string) => {
    if (readonly || !updateNodeData) return;

    const updatedOutputs = localOutputs.map((output) =>
      output.id === outputId ? { ...output, hidden: !output.hidden } : output
    );

    updateNodeData(node.id, {
      ...node.data,
      outputs: updatedOutputs,
    });

    setLocalOutputs(updatedOutputs);
  };

  return (
    <Card className="border-none shadow-none rounded-none h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          {readonly ? "Node Properties (Read-only)" : "Node Properties"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="text-sm">{node.data.nodeType || node.type}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              value={localName}
              onChange={handleNameChange}
              disabled={readonly}
              className={readonly ? "opacity-70 cursor-not-allowed" : ""}
            />
          </div>

          <div className="space-y-2">
            <h2 className="font-medium border-b border-border pb-2">Inputs</h2>
            <div className="space-y-2">
              {localInputs.length > 0 ? (
                localInputs.map((input) => (
                  <div key={input.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{input.name}</span>
                        <span className="text-xs text-neutral-500">
                          {input.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {input.value !== undefined && !readonly && (
                          <button
                            onClick={() => handleClearValue(input.id)}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            aria-label={`Clear ${input.name} value`}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <Toggle
                          size="sm"
                          pressed={input.hidden}
                          onPressedChange={() =>
                            handleToggleVisibility(input.id)
                          }
                          aria-label={`Toggle visibility for ${input.name}`}
                          className={`bg-transparent data-[state=on]:bg-transparent hover:bg-transparent data-[state=on]:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors ${
                            readonly ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          disabled={readonly}
                        >
                          {input.hidden ? (
                            <EyeOffIcon className="h-3 w-3" />
                          ) : (
                            <EyeIcon className="h-3 w-3" />
                          )}
                        </Toggle>
                      </div>
                    </div>

                    <div className="relative">
                      {input.type === "string" ? (
                        <Textarea
                          placeholder={`Enter ${input.type} value`}
                          value={
                            input.value !== undefined ? String(input.value) : ""
                          }
                          onChange={(e) =>
                            handleInputValueChange(input.id, e.target.value)
                          }
                          className={`text-sm min-h-[80px] resize-y ${
                            readonly ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          disabled={readonly}
                        />
                      ) : (
                        <Input
                          placeholder={`Enter ${input.type} value`}
                          value={
                            input.value !== undefined ? String(input.value) : ""
                          }
                          onChange={(e) =>
                            handleInputValueChange(input.id, e.target.value)
                          }
                          className={`text-sm h-8 ${
                            readonly ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          disabled={readonly}
                        />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No inputs</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium border-b border-border pb-2">Outputs</h2>
            <div className="space-y-2">
              {localOutputs.length > 0 ? (
                localOutputs.map((output) => (
                  <div key={output.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{output.name}</span>
                        <span className="text-xs text-neutral-500">
                          {output.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle
                          size="sm"
                          pressed={output.hidden}
                          onPressedChange={() =>
                            handleToggleOutputVisibility(output.id)
                          }
                          aria-label={`Toggle visibility for ${output.name}`}
                          className={`bg-transparent data-[state=on]:bg-transparent hover:bg-transparent data-[state=on]:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors ${
                            readonly ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          disabled={readonly}
                        >
                          {output.hidden ? (
                            <EyeOffIcon className="h-3 w-3" />
                          ) : (
                            <EyeIcon className="h-3 w-3" />
                          )}
                        </Toggle>
                      </div>
                    </div>
                    <WorkflowOutputRenderer
                      output={output}
                      createObjectUrl={createObjectUrl}
                    />
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No outputs</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
