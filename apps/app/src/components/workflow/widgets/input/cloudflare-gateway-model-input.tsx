import {
  CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
  type CloudflareGatewayModelSchema,
} from "@dafthunk/types";
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

import {
  CFG_META_KEY,
  CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
  encodeCloudflareGatewayModelMeta,
} from "./cloudflare-gateway-model-utils";

interface CloudflareGatewayModelInputProps extends BaseWidgetProps {
  nodeId: string;
  model: string;
  hasSchemaParams: boolean;
}

/** Valid identifier is `author/model` (exactly two non-empty segments). */
function isValidModelId(modelId: string): boolean {
  const parts = modelId.split("/");
  return parts.length === 2 && !!parts[0] && !!parts[1];
}

function CloudflareGatewayModelInputWidget({
  nodeId,
  model,
  hasSchemaParams,
  className,
  disabled = false,
}: CloudflareGatewayModelInputProps) {
  const [value, setValue] = useState(model ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { updateNodeData, edges, deleteEdge } = useWorkflow();

  // Sync local value when model prop changes externally.
  const [prevModel, setPrevModel] = useState(model);
  if (model !== prevModel) {
    setPrevModel(model);
    setValue(model ?? "");
  }

  const applySchema = useCallback(
    async (modelId: string) => {
      if (!isValidModelId(modelId)) {
        setError("Enter a valid identifier (e.g., xai/grok-imagine-video)");
        return;
      }
      const [author, name] = modelId.split("/");

      setLoading(true);
      setError(null);

      try {
        const schema = await makeRequest<CloudflareGatewayModelSchema>(
          `/cloudflare-gateway/models/${author}/${name}/schema`
        );

        setValue(modelId);

        const modelParam: WorkflowParameter = {
          id: "model",
          name: "model",
          type: "string",
          description:
            "Cloudflare unified model identifier in the format author/model",
          required: true,
          hidden: true,
          value: modelId,
        };

        const schemaInputs: WorkflowParameter[] = schema.inputs.map(
          (param) => ({
            ...param,
            id: param.name,
          })
        );

        // Hidden marker so the runtime presigns an upload URL for file-output
        // models (e.g. video generation).
        const uploadMarker: WorkflowParameter[] = schema.requiresUploadUrl
          ? [
              {
                id: CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
                name: CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
                type: "string",
                description: "Internal: presigned output upload destination",
                hidden: true,
                value: "",
              },
            ]
          : [];

        const schemaOutputs: WorkflowParameter[] = schema.outputs.map(
          (param) => ({
            ...param,
            id: param.name,
          })
        );

        const newInputs = [modelParam, ...schemaInputs, ...uploadMarker];
        const newOutputs = schemaOutputs;

        if (edges && deleteEdge) {
          for (const edge of edges) {
            if (edge.target === nodeId || edge.source === nodeId) {
              deleteEdge(edge.id);
            }
          }
        }

        updateNodeData?.(nodeId, (current) => ({
          inputs: newInputs,
          outputs: newOutputs,
          metadata: {
            ...(current.metadata ?? {}),
            [CFG_META_KEY]: encodeCloudflareGatewayModelMeta({
              description: schema.description,
            }),
          },
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load model schema"
        );
      } finally {
        setLoading(false);
      }
    },
    [updateNodeData, edges, deleteEdge, nodeId]
  );

  const handleLoad = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || !updateNodeData) return;

    if (!isValidModelId(trimmed)) {
      setError("Enter a valid identifier (e.g., xai/grok-imagine-video)");
      return;
    }

    if (hasSchemaParams) {
      setShowConfirm(true);
    } else {
      applySchema(trimmed);
    }
  }, [value, disabled, updateNodeData, hasSchemaParams, applySchema]);

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
          placeholder="author/model"
          disabled={disabled || loading}
          className="h-auto text-xs font-mono"
        />
        <Button
          variant="outline"
          onClick={handleLoad}
          disabled={disabled || loading || !value.trim()}
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

export const cloudflareGatewayModelInputWidget = createWidget({
  component: CloudflareGatewayModelInputWidget,
  nodeTypes: [CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE],
  inputField: "model",
  extractConfig: (nodeId, inputs, outputs) => ({
    nodeId,
    model: getInputValue(inputs, "model", ""),
    hasSchemaParams: inputs.length > 1 || (outputs ?? []).length > 0,
  }),
});
