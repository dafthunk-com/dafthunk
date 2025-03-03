import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WorkflowNodeInspectorProps } from "./workflow-types";

export function WorkflowNodeInspector({
  node,
  onNodeUpdate,
}: WorkflowNodeInspectorProps) {
  if (!node) return null;

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { label: e.target.value });
    }
  };

  const handleInputValueChange = (inputId: string, value: string) => {
    if (!onNodeUpdate) return;

    // Create a new inputs array with the updated value
    const updatedInputs = node.data.inputs.map((input) => {
      if (input.id === inputId) {
        return { ...input, value: convertValueByType(value, input.type) };
      }
      return input;
    });

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
              value={node.data.label}
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
              {node.data.inputs.map((input) => (
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
              {node.data.inputs.length === 0 && (
                <div className="text-sm text-gray-500">No inputs</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Outputs</Label>
            <div className="space-y-1">
              {node.data.outputs.map((output) => (
                <div
                  key={output.id}
                  className="text-sm flex items-center justify-between"
                >
                  <span>{output.label}</span>
                  <span className="text-xs text-gray-500">{output.type}</span>
                </div>
              ))}
              {node.data.outputs.length === 0 && (
                <div className="text-sm text-gray-500">No outputs</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
