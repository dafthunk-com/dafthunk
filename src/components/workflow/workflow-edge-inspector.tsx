import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WorkflowEdgeInspectorProps } from "./workflow-types";

export function WorkflowEdgeInspector({
  edge,
  onEdgeUpdate,
}: WorkflowEdgeInspectorProps) {
  if (!edge) return null;

  const handleValidToggle = (checked: boolean) => {
    if (onEdgeUpdate) {
      onEdgeUpdate(edge.id, { isValid: checked });
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Connection Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <div className="text-sm">{edge.source}</div>
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <div className="text-sm">{edge.target}</div>
          </div>

          {edge.data?.sourceType && edge.data?.targetType && (
            <div className="space-y-2">
              <Label>Type Connection</Label>
              <div className="text-sm">
                {edge.data.sourceType} → {edge.data.targetType}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="edge-valid"
              checked={edge.data?.isValid ?? true}
              onCheckedChange={handleValidToggle}
            />
            <Label htmlFor="edge-valid">Valid Connection</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
