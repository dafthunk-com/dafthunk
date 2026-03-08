import type { ObjectReference } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import { createElement, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PropertyField } from "./fields";
import { registry } from "./widgets";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  updateNodeName,
  useWorkflow,
} from "./workflow-context";
import type { WorkflowNodeType } from "./workflow-types";

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

  // Local state only for the name input (controlled text field needs immediate feedback)
  const [localName, setLocalName] = useState<string>(node?.data.name || "");
  const [prevName, setPrevName] = useState(node?.data.name);
  if (node && node.data.name !== prevName) {
    setPrevName(node.data.name);
    setLocalName(node.data.name);
  }

  // Collapsible section state
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [inputsExpanded, setInputsExpanded] = useState(true);
  const [outputsExpanded, setOutputsExpanded] = useState(true);
  const [errorExpanded, setErrorExpanded] = useState(true);

  if (!node) return null;

  // Read inputs/outputs directly from node data — no intermediate state to get stale
  const inputs = node.data.inputs;
  const outputs = node.data.outputs;

  // Helper function to check if an input is connected
  // Inputs are always targets, so we only check targetHandle
  const isInputConnected = (inputId: string): boolean => {
    return edges.some(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );
  };

  // Helper function to get the value from a connected output
  // Inputs are always targets, so we find the source node's output value
  const getConnectedValue = (inputId: string): unknown => {
    const connectedEdge = edges.find(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );

    if (!connectedEdge) return undefined;

    const sourceNode = nodes.find((n) => n.id === connectedEdge.source);
    if (!sourceNode) return undefined;

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
    clearNodeInput(node.id, inputId, inputs, updateNodeData);
  };

  const handleToggleVisibility = (inputId: string) => {
    if (disabled || !updateNodeData) return;

    const updatedInputs = inputs.map((input) =>
      input.id === inputId ? { ...input, hidden: !input.hidden } : input
    );

    updateNodeData(node.id, {
      ...node.data,
      inputs: updatedInputs,
    });
  };

  const handleToggleOutputVisibility = (outputId: string) => {
    if (disabled || !updateNodeData) return;

    const updatedOutputs = outputs.map((output) =>
      output.id === outputId ? { ...output, hidden: !output.hidden } : output
    );

    updateNodeData(node.id, {
      ...node.data,
      outputs: updatedOutputs,
    });
  };

  const handleDisconnect = (inputId: string) => {
    if (disabled || !deleteEdge) return;

    // Find all edges where this input is the target
    const connectedEdges = edges.filter(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );

    // Delete all connected edges
    connectedEdges.forEach((edge) => deleteEdge(edge.id));
  };

  const nodeType = node.data.nodeType || node.type;
  const widget = nodeType
    ? registry.for(nodeType, node.id, inputs, outputs)
    : null;

  const handleWidgetChange = (value: unknown) => {
    if (disabled || !updateNodeData || !widget) return;
    updateNodeInput(node.id, widget.inputField, value, inputs, updateNodeData);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Node Properties Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setPropertiesExpanded(!propertiesExpanded)}
            className="group w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">
              Node Properties
            </h2>
            <ChevronDownIcon
              className={`h-4 w-4 ${
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
                  className={`mt-2 ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
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
                  className={`mt-2 ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Inputs Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setInputsExpanded(!inputsExpanded)}
            className="group w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">Inputs</h2>
            <ChevronDownIcon
              className={`h-4 w-4 ${
                inputsExpanded ? "rotate-0" : "-rotate-90"
              } text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300`}
            />
          </button>
          {inputsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {inputs.length > 0 ? (
                inputs.map((input) => {
                  if (widget && widget.managedFields.has(input.id) && input.id !== widget.inputField) {
                    return null;
                  }
                  if (widget && input.id === widget.inputField) {
                    return (
                      <div key={input.id}>
                        <PropertyField
                          parameter={input}
                          value={input.value}
                          onChange={() => {}}
                          onClear={() => handleClearValue(input.id)}
                          onToggleVisibility={() =>
                            handleToggleVisibility(input.id)
                          }
                          disabled={disabled}
                          createObjectUrl={createObjectUrl}
                          headerOnly
                        />
                        <div className="[&_button]:h-9 [&_button]:text-sm [&_select]:h-9 [&_select]:text-sm">
                          {createElement(widget.Component, {
                            ...widget.config,
                            onChange: !disabled ? handleWidgetChange : () => {},
                            disabled,
                            createObjectUrl,
                            className: "p-0",
                          })}
                        </div>
                      </div>
                    );
                  }
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
                        updateNodeInput(
                          node.id,
                          input.id,
                          typedValue,
                          inputs,
                          updateNodeData
                        );
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
            className="group w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">Outputs</h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-neutral-400 dark:text-neutral-500 ${
                outputsExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {outputsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {outputs.length > 0 ? (
                outputs.map((output) => (
                  <PropertyField
                    key={output.id}
                    parameter={output}
                    value={output.value}
                    onChange={() => {}}
                    onClear={() => {}}
                    onToggleVisibility={() =>
                      handleToggleOutputVisibility(output.id)
                    }
                    disabled // Outputs are always read-only
                    createObjectUrl={createObjectUrl}
                  />
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No outputs</div>
              )}
            </div>
          )}
        </div>

        {/* Error Section - only show when there's an error */}
        {node.data.error && (
          <div className="border-b border-border">
            <button
              onClick={() => setErrorExpanded(!errorExpanded)}
              className="group w-full px-4 py-3 flex items-center justify-between"
            >
              <h2 className="text-base font-semibold text-foreground">Error</h2>
              <ChevronDownIcon
                className={`h-4 w-4 text-neutral-400 dark:text-neutral-500 ${
                  errorExpanded ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>
            {errorExpanded && (
              <div className="px-4 pb-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {node.data.error}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
