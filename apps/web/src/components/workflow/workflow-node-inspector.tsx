import type { ObjectReference } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PropertyField } from "./fields";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  updateNodeName,
  useWorkflow,
} from "./workflow-context";
import type { WorkflowNodeType } from "./workflow-types";
import type { WorkflowParameter } from "./workflow-types";

export interface WorkflowNodeInspectorProps {
  node: ReactFlowNode<WorkflowNodeType> | null;
  nodes?: ReactFlowNode<WorkflowNodeType>[];
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  disabled?: boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
}

export function WorkflowNodeInspector({
  node,
  nodes = [],
  onNodeUpdate,
  createObjectUrl,
  disabled = false,
}: WorkflowNodeInspectorProps) {
  const {
    updateNodeData: contextUpdateNodeData,
    edges = [],
    deleteEdge,
  } = useWorkflow();

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

  // Collapsible section state
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [inputsExpanded, setInputsExpanded] = useState(true);
  const [outputsExpanded, setOutputsExpanded] = useState(true);
  const [errorExpanded, setErrorExpanded] = useState(true);

  // Update local state when node data changes
  useEffect(() => {
    if (!node) return;

    setLocalName(node.data.name);
    setLocalInputs(node.data.inputs);
    setLocalOutputs(node.data.outputs);
  }, [node, node?.data.name, node?.data.inputs, node?.data.outputs]);

  if (!node) return null;

  // Helper function to check if an input is connected
  const isInputConnected = (inputId: string): boolean => {
    return edges.some(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );
  };

  // Helper function to get the value from a connected output
  const getConnectedValue = (inputId: string): unknown => {
    // Find the edge connected to this input
    const connectedEdge = edges.find(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );

    if (!connectedEdge) return undefined;

    // Find the source node
    const sourceNode = nodes.find((n) => n.id === connectedEdge.source);
    if (!sourceNode) return undefined;

    // Find the output with the matching handle ID
    const output = sourceNode.data.outputs.find(
      (out) => out.id === connectedEdge.sourceHandle
    );

    return output?.value;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const newName = e.target.value;
    setLocalName(newName);
    updateNodeName(node.id, newName, updateNodeData);
  };

  const handleClearValue = (inputId: string) => {
    if (disabled || !updateNodeData) return;

    const updatedInputs = clearNodeInput(
      node.id,
      inputId,
      localInputs,
      updateNodeData
    );

    setLocalInputs(updatedInputs);
  };

  const handleToggleVisibility = (inputId: string) => {
    if (disabled || !updateNodeData) return;

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
    if (disabled || !updateNodeData) return;

    const updatedOutputs = localOutputs.map((output) =>
      output.id === outputId ? { ...output, hidden: !output.hidden } : output
    );

    updateNodeData(node.id, {
      ...node.data,
      outputs: updatedOutputs,
    });

    setLocalOutputs(updatedOutputs);
  };

  const handleDisconnect = (inputId: string) => {
    if (disabled || !deleteEdge) return;

    // Find all edges connected to this input
    const connectedEdges = edges.filter(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );

    // Delete all connected edges
    connectedEdges.forEach((edge) => deleteEdge(edge.id));
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Node Properties Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setPropertiesExpanded(!propertiesExpanded)}
            className="group w-full px-4 py-3 flex items-center justify-between transition-colors"
          >
            <h2 className="text-base font-semibold text-foreground">
              {disabled ? "Node Properties (Read-only)" : "Node Properties"}
            </h2>
            <ChevronDownIcon
              className={`h-4 w-4 transition-all ${
                propertiesExpanded ? "rotate-0" : "-rotate-90"
              } text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300`}
            />
          </button>
          {propertiesExpanded && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Configure the name and type for this node.
              </p>
              {/* Name Section */}
              <div>
                <Label
                  htmlFor="node-name"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Name
                </Label>
                <Input
                  id="node-name"
                  value={localName}
                  onChange={handleNameChange}
                  disabled={disabled}
                  className={`mt-2 text-sm h-8 ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                />
              </div>

              {/* Type Section */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Type
                </Label>
                <Input
                  id="node-type"
                  value={node.data.nodeType || node.type}
                  disabled={true}
                  className={`mt-2 text-sm h-8 ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Inputs Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setInputsExpanded(!inputsExpanded)}
            className="group w-full px-4 py-3 flex items-center justify-between transition-colors"
          >
            <h2 className="text-base font-semibold text-foreground">Inputs</h2>
            <ChevronDownIcon
              className={`h-4 w-4 transition-all ${
                inputsExpanded ? "rotate-0" : "-rotate-90"
              } text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300`}
            />
          </button>
          {inputsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {localInputs.length > 0 ? (
                localInputs.map((input) => {
                  const isConnected = isInputConnected(input.id);
                  return (
                    <PropertyField
                      key={input.id}
                      parameter={input}
                      value={
                        isConnected ? getConnectedValue(input.id) : input.value
                      }
                      onChange={(value) => {
                        const typedValue = convertValueByType(
                          value as string,
                          input.type || "string"
                        );
                        const updatedInputs = updateNodeInput(
                          node.id,
                          input.id,
                          typedValue,
                          localInputs,
                          updateNodeData
                        );
                        setLocalInputs(updatedInputs);
                      }}
                      onClear={() => handleClearValue(input.id)}
                      onDisconnect={() => handleDisconnect(input.id)}
                      onToggleVisibility={() =>
                        handleToggleVisibility(input.id)
                      }
                      disabled={disabled}
                      connected={isConnected}
                      createObjectUrl={createObjectUrl}
                    />
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">No inputs</div>
              )}
            </div>
          )}
        </div>

        {/* Outputs Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setOutputsExpanded(!outputsExpanded)}
            className="group w-full px-4 py-3 flex items-center justify-between transition-colors"
          >
            <h2 className="text-base font-semibold text-foreground">Outputs</h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-neutral-400 dark:text-neutral-500 transition-transform ${
                outputsExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {outputsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {localOutputs.length > 0 ? (
                localOutputs.map((output) => (
                  <PropertyField
                    key={output.id}
                    parameter={output}
                    value={output.value}
                    onChange={() => {}}
                    onClear={() => {}}
                    onToggleVisibility={() =>
                      handleToggleOutputVisibility(output.id)
                    }
                    disabled={true}
                    createObjectUrl={createObjectUrl}
                  />
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No outputs</div>
              )}
            </div>
          )}
        </div>

        {/* Error Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setErrorExpanded(!errorExpanded)}
            className="group w-full px-4 py-3 flex items-center justify-between transition-colors"
          >
            <h2 className="text-base font-semibold text-foreground">Error</h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-neutral-400 dark:text-neutral-500 transition-transform ${
                errorExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {errorExpanded && (
            <div className="px-4 pb-4">
              {node.data.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {node.data.error}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No errors</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
