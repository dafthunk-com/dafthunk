import type { ObjectReference } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";
import AsteriskIcon from "lucide-react/icons/asterisk";
import BoxIcon from "lucide-react/icons/box";
import BracesIcon from "lucide-react/icons/braces";
import BuildingIcon from "lucide-react/icons/building";
import Building2Icon from "lucide-react/icons/building-2";
import CalendarIcon from "lucide-react/icons/calendar";
import ChartNoAxesGanttIcon from "lucide-react/icons/chart-no-axes-gantt";
import CheckIcon from "lucide-react/icons/check";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import DotIcon from "lucide-react/icons/dot";
import EllipsisIcon from "lucide-react/icons/ellipsis";
import EyeIcon from "lucide-react/icons/eye";
import EyeOffIcon from "lucide-react/icons/eye-off";
import GlobeIcon from "lucide-react/icons/globe";
import HashIcon from "lucide-react/icons/hash";
import ImageIcon from "lucide-react/icons/image";
import LayoutGridIcon from "lucide-react/icons/layout-grid";
import LockIcon from "lucide-react/icons/lock";
import MinusIcon from "lucide-react/icons/minus";
import MusicIcon from "lucide-react/icons/music";
import ShapesIcon from "lucide-react/icons/shapes";
import SquareIcon from "lucide-react/icons/square";
import StickyNoteIcon from "lucide-react/icons/sticky-note";
import TriangleIcon from "lucide-react/icons/triangle";
import TypeIcon from "lucide-react/icons/type";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";

import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  updateNodeName,
  useWorkflow,
} from "./workflow-context";
import { ClearButton, UnplugButton, InputWidget } from "./inputs";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import type { InputOutputType, WorkflowParameter } from "./workflow-types";
import type { WorkflowNodeType } from "./workflow-types";

const getTypeIcon = (type: InputOutputType) => {
  const iconSize = "h-3.5 w-3.5";
  const icons: Record<InputOutputType, React.ReactNode> = {
    string: <TypeIcon className={iconSize} />,
    number: <HashIcon className={iconSize} />,
    boolean: <CheckIcon className={iconSize} />,
    image: <ImageIcon className={iconSize} />,
    document: <StickyNoteIcon className={iconSize} />,
    audio: <MusicIcon className={iconSize} />,
    buffergeometry: <BoxIcon className={iconSize} />,
    gltf: <BoxIcon className={iconSize} />,
    json: <BracesIcon className={iconSize} />,
    date: <CalendarIcon className={iconSize} />,
    point: <DotIcon className={iconSize} />,
    multipoint: <EllipsisIcon className={iconSize} />,
    linestring: <MinusIcon className={iconSize} />,
    multilinestring: <ChartNoAxesGanttIcon className={iconSize} />,
    polygon: <TriangleIcon className={iconSize} />,
    multipolygon: <ShapesIcon className={iconSize} />,
    geometry: <SquareIcon className={iconSize} />,
    geometrycollection: <LayoutGridIcon className={iconSize} />,
    feature: <BuildingIcon className={iconSize} />,
    featurecollection: <Building2Icon className={iconSize} />,
    geojson: <GlobeIcon className={iconSize} />,
    secret: <LockIcon className={iconSize} />,
    any: <AsteriskIcon className={iconSize} />,
  };
  return icons[type] || icons.any;
};

export interface WorkflowNodeInspectorProps {
  node: ReactFlowNode<WorkflowNodeType> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  disabled?: boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
}

export function WorkflowNodeInspector({
  node,
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

  // Update local state when node changes
  useEffect(() => {
    if (!node) return;

    setLocalName(node.data.name);
    setLocalInputs(node.data.inputs);
    setLocalOutputs(node.data.outputs);
  }, [node]);

  if (!node) return null;

  // Helper function to check if an input is connected
  const isInputConnected = (inputId: string): boolean => {
    return edges.some(
      (edge) => edge.target === node.id && edge.targetHandle === inputId
    );
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const newName = e.target.value;
    setLocalName(newName);
    updateNodeName(node.id, newName, updateNodeData);
  };

  const handleInputValueChange = (inputId: string, value: string) => {
    if (disabled || !updateNodeData) return;

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
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">
              {disabled ? "Node Properties (Read-only)" : "Node Properties"}
            </h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                propertiesExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {propertiesExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {/* Type Section */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Type
                </Label>
                <div className="text-sm text-foreground mt-1">
                  {node.data.nodeType || node.type}
                </div>
              </div>

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
            </div>
          )}
        </div>

        {/* Inputs Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setInputsExpanded(!inputsExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">Inputs</h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                inputsExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {inputsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {localInputs.length > 0 ? (
                localInputs.map((input) => {
                  const isConnected = isInputConnected(input.id);
                  return (
                    <div key={input.id} className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground shrink-0">
                            {getTypeIcon(input.type)}
                          </span>
                          <span className="text-foreground font-medium font-mono truncate">
                            {input.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!disabled && (
                            <>
                              {isConnected ? (
                                <UnplugButton
                                  onClick={() => handleDisconnect(input.id)}
                                  label={`Disconnect ${input.name}`}
                                />
                              ) : (
                                input.value !== undefined && (
                                  <ClearButton
                                    onClick={() => handleClearValue(input.id)}
                                    label={`Clear ${input.name} value`}
                                  />
                                )
                              )}
                            </>
                          )}
                          <Toggle
                            size="sm"
                            pressed={input.hidden}
                            onPressedChange={() =>
                              handleToggleVisibility(input.id)
                            }
                            aria-label={`Toggle visibility for ${input.name}`}
                            className={`px-1 h-8 w-8 bg-transparent data-[state=on]:bg-transparent hover:bg-muted data-[state=on]:text-muted-foreground hover:text-foreground transition-colors ${
                              disabled ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                            disabled={disabled}
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
                        <InputWidget
                          input={input}
                          value={input.value}
                          onChange={(value) => {
                            const typedValue = convertValueByType(
                              typeof value === "string" ? value : value,
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
                          disabled={disabled || isConnected}
                          createObjectUrl={createObjectUrl}
                          className="w-full"
                        />
                      </div>
                    </div>
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
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">Outputs</h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                outputsExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {outputsExpanded && (
            <div className="px-4 pb-4 space-y-3">
              {localOutputs.length > 0 ? (
                localOutputs.map((output) => (
                  <div key={output.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground shrink-0">
                          {getTypeIcon(output.type)}
                        </span>
                        <span className="text-foreground font-medium font-mono truncate">
                          {output.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Toggle
                          size="sm"
                          pressed={output.hidden}
                          onPressedChange={() =>
                            handleToggleOutputVisibility(output.id)
                          }
                          aria-label={`Toggle visibility for ${output.name}`}
                          className={`px-1 h-8 w-8 bg-transparent data-[state=on]:bg-transparent hover:bg-muted data-[state=on]:text-muted-foreground hover:text-foreground transition-colors ${
                            disabled ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          disabled={disabled}
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
                <div className="text-sm text-muted-foreground">No outputs</div>
              )}
            </div>
          )}
        </div>

        {/* Error Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setErrorExpanded(!errorExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <h2 className="text-base font-semibold text-foreground">Error</h2>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted-foreground transition-transform ${
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
