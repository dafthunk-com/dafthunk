import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  WorkflowNodeInspectorProps,
  WorkflowParameter,
} from "./workflow-types";
import { useState, useEffect, createElement } from "react";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import {
  useWorkflow,
  updateNodeInput,
  updateNodeName,
  convertValueByType,
  clearNodeInput,
} from "./workflow-context";
import { XCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { SliderWidget } from "./widgets/slider-widget";
import { RadioGroupWidget } from "./widgets/radio-group-widget";
import { TextAreaWidget } from "./widgets/text-area-widget";
import { InputTextWidget } from "./widgets/input-text-widget";
import { NumberInputWidget } from "./widgets/number-input-widget";
import { MonacoEditorWidget } from "./widgets/monaco-editor-widget";
import { CanvasDoodleWidget } from "./widgets/canvas-doodle-widget";
import { WebcamWidget } from "./widgets/webcam-widget";
import { AudioRecorderWidget } from "./widgets/audio-recorder-widget";
import { createWidgetConfig } from "./widgets/widget-factory";
import { DocumentWidget } from "./widgets/document-widget";

export function WorkflowNodeInspector({
  node,
  onNodeUpdate,
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

  // Check if the node is a widget node
  const nodeType = node.data.nodeType;

  // Get widget configuration
  const widgetConfig = nodeType
    ? createWidgetConfig(node.id, localInputs as WorkflowParameter[], nodeType)
    : null;

  const handleWidgetChange = (value: any) => {
    if (readonly || !updateNodeData || !widgetConfig) return;

    const valueInput = localInputs.find((i) => i.id === "value");
    if (valueInput) {
      const updatedInputs = updateNodeInput(
        node.id,
        valueInput.id,
        value,
        localInputs,
        updateNodeData
      );
      setLocalInputs(updatedInputs);
    }
  };

  const widgetComponents: Record<
    string,
    React.FC<{ config: any; onChange: (value: any) => void; readonly?: boolean }>
  > = {
    slider: SliderWidget,
    "radio-group": RadioGroupWidget,
    "text-area": TextAreaWidget,
    "input-text": InputTextWidget,
    "number-input": NumberInputWidget,
    "monaco-editor": MonacoEditorWidget,
    "canvas-doodle": CanvasDoodleWidget,
    webcam: WebcamWidget,
    "audio-recorder": AudioRecorderWidget,
    document: DocumentWidget,
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
              className={readonly ? "opacity-70" : ""}
            />
          </div>

          {/* Widget */}
          {widgetConfig && nodeType && widgetComponents[nodeType] && (
            <div className="space-y-2">
              <Label>Widget</Label>
              {createElement(widgetComponents[nodeType], {
                config: widgetConfig,
                onChange: handleWidgetChange,
                readonly: readonly,
              })}
            </div>
          )}

          <div className="space-y-2">
            <Label>Inputs</Label>
            <div className="space-y-2">
              {localInputs.length > 0 ? (
                localInputs.map((input) => (
                  <div key={input.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{input.name}</span>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {input.type}
                      </span>
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
                          className="text-sm min-h-[80px] resize-y pr-16"
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
                          className="text-sm h-8 pr-16"
                        />
                      )}
                      <div
                        className={`absolute right-2 ${input.type === "string" ? "top-2" : "top-1/2 -translate-y-1/2"} flex items-center gap-2`}
                      >
                        {input.value !== undefined && (
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
                          className="bg-transparent data-[state=on]:bg-transparent hover:bg-transparent data-[state=on]:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          {input.hidden ? (
                            <EyeOffIcon className="h-3 w-3" />
                          ) : (
                            <EyeIcon className="h-3 w-3" />
                          )}
                        </Toggle>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No inputs</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Outputs</Label>
            <div className="space-y-2">
              {localOutputs.length > 0 ? (
                localOutputs.map((output) => (
                  <div key={output.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span>{output.name}</span>
                      <span className="text-xs text-neutral-500">
                        {output.type}
                      </span>
                    </div>
                    <WorkflowOutputRenderer output={output} />
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
