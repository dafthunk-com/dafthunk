import type { ReplicateModelSchema } from "@dafthunk/types";
import LoaderCircle from "lucide-react/icons/loader-circle";
import RotateCw from "lucide-react/icons/rotate-cw";
import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { makeRequest } from "@/services/utils";
import { cn } from "@/utils/utils";

import { useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface ReplicateModelInputProps extends BaseWidgetProps {
  nodeId: string;
  model: string;
  hasSchemaParams: boolean;
}

function ReplicateModelInputWidget({
  nodeId,
  model,
  hasSchemaParams,
  onChange,
  className,
  readonly = false,
}: ReplicateModelInputProps) {
  const [value, setValue] = useState(model ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { updateNodeData, edges, deleteEdge } = useWorkflow();

  const applySchema = useCallback(
    async (modelId: string) => {
      // Validate format before making network request
      const [ownerName] = modelId.split(":");
      const parts = ownerName.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        setError("Enter a valid model identifier (e.g., google/veo-3)");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const schema = await makeRequest<ReplicateModelSchema>(
          `/replicate/models/${parts[0]}/${parts[1]}/schema`
        );

        // Update the model input value
        onChange(modelId);

        // Build new inputs: keep the model param, add schema-derived params
        const modelParam: WorkflowParameter = {
          id: "model",
          name: "model",
          type: "string",
          description:
            "Replicate model identifier in the format provider/model or provider/model:version",
          required: true,
          value: modelId,
        };

        const schemaInputs: WorkflowParameter[] = schema.inputs.map(
          (param) => ({
            ...param,
            id: param.name,
          })
        );

        const schemaOutputs: WorkflowParameter[] = schema.outputs.map(
          (param) => ({
            ...param,
            id: param.name,
          })
        );

        const newInputs = [modelParam, ...schemaInputs];
        const newOutputs = schemaOutputs;

        // Remove all edges connected to this node
        if (edges && deleteEdge) {
          for (const edge of edges) {
            if (edge.target === nodeId || edge.source === nodeId) {
              deleteEdge(edge.id);
            }
          }
        }

        // Replace the entire inputs/outputs arrays
        updateNodeData?.(nodeId, {
          inputs: newInputs,
          outputs: newOutputs,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load model schema"
        );
      } finally {
        setLoading(false);
      }
    },
    [onChange, updateNodeData, edges, deleteEdge, nodeId]
  );

  const handleLoad = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || readonly || !updateNodeData) return;

    // Validate format
    const [ownerName] = trimmed.split(":");
    const parts = ownerName.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError("Enter a valid model identifier (e.g., google/veo-3)");
      return;
    }

    // If the node already has schema-derived params, confirm first
    if (hasSchemaParams) {
      setShowConfirm(true);
    } else {
      applySchema(trimmed);
    }
  }, [value, readonly, updateNodeData, hasSchemaParams, applySchema]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    applySchema(value.trim());
  }, [value, applySchema]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLoad();
    }
  };

  return (
    <div className={cn("p-2 space-y-2", className)}>
      <div className="flex items-stretch gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="provider/model"
          disabled={readonly || loading}
          className="h-auto text-xs font-mono"
        />
        <Button
          variant="outline"
          onClick={handleLoad}
          disabled={readonly || loading || !value.trim()}
          className="h-auto px-2 shrink-0"
        >
          {loading ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reload model schema?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current parameters and remove all connected
              edges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const replicateModelInputWidget = createWidget({
  component: ReplicateModelInputWidget,
  nodeTypes: ["replicate-model"],
  inputField: "model",
  extractConfig: (nodeId, inputs, outputs) => ({
    nodeId,
    model: getInputValue(inputs, "model", ""),
    hasSchemaParams: inputs.length > 1 || (outputs ?? []).length > 0,
  }),
});
