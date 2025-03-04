import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WorkflowNodeInspectorProps } from "./workflow-types";
import { useState, useEffect } from "react";

export function WorkflowNodeInspector({
  node,
  onNodeUpdate,
}: WorkflowNodeInspectorProps) {
  if (!node) return null;

  // Create local state to immediately reflect changes in the UI
  const [localLabel, setLocalLabel] = useState(node.data.label);
  const [localInputs, setLocalInputs] = useState(node.data.inputs);
  const [localOutputs, setLocalOutputs] = useState(node.data.outputs);

  // Update local state when node changes
  useEffect(() => {
    console.log(`Node inspector updating for node ${node.id}:`, node.data);
    setLocalLabel(node.data.label);
    setLocalInputs(node.data.inputs);
    setLocalOutputs(node.data.outputs);
  }, [node.id, node.data.label, node.data.inputs, node.data.outputs]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    // Update local state immediately
    setLocalLabel(newLabel);

    // Propagate change to parent component
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { label: newLabel });
    }
  };

  const handleInputValueChange = (inputId: string, value: string) => {
    if (!onNodeUpdate) return;

    // Create a new inputs array with the updated value
    const updatedInputs = localInputs.map((input) => {
      if (input.id === inputId) {
        return { ...input, value: convertValueByType(value, input.type) };
      }
      return input;
    });

    // Update local state immediately
    setLocalInputs(updatedInputs);

    // Propagate change to parent component
    onNodeUpdate(node.id, { inputs: updatedInputs });
  };

  // Convert string values to the appropriate type
  const convertValueByType = (value: string, type: string) => {
    if (type === "number") {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    if (type === "boolean") {
      return value.toLowerCase() === "true";
    }
    return value; // Default to string
  };

  // Format output value for display
  const formatOutputValue = (value: any, type: string): string => {
    if (value === undefined || value === null) return "";
    if (type === "object" || type === "array") {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    return String(value);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Node Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              value={localLabel}
              onChange={handleLabelChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="text-sm">{node.data.nodeType || node.type}</div>
          </div>

          <div className="space-y-2">
            <Label>Inputs</Label>
            <div className="space-y-2">
              {localInputs.map((input) => (
                <div key={input.id} className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{input.label}</span>
                    <span className="text-xs text-gray-500">{input.type}</span>
                  </div>
                  <Input
                    placeholder={`Enter ${input.type} value`}
                    value={input.value !== undefined ? String(input.value) : ""}
                    onChange={(e) =>
                      handleInputValueChange(input.id, e.target.value)
                    }
                    className="text-sm h-8"
                  />
                </div>
              ))}
              {localInputs.length === 0 && (
                <div className="text-sm text-gray-500">No inputs</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Outputs</Label>
            <div className="space-y-2">
              {localOutputs.map((output) => (
                <div key={output.id} className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{output.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">
                        {output.type}
                      </span>
                    </div>
                  </div>
                  <Input
                    value={formatOutputValue(output.value, output.type)}
                    readOnly
                    className="text-sm h-8 cursor-not-allowed bg-muted bg-gray-100"
                  />
                </div>
              ))}
              {localOutputs.length === 0 && (
                <div className="text-sm text-gray-500">No outputs</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
