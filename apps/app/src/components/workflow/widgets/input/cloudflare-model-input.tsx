import type {
  CloudflareModelInfo,
  CloudflareModelSchema,
} from "@dafthunk/types";
import LoaderCircle from "lucide-react/icons/loader-circle";
import RotateCw from "lucide-react/icons/rotate-cw";
import Search from "lucide-react/icons/search";
import { useCallback, useMemo, useState } from "react";

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
import { makeRequest } from "@/services/utils";
import { cn } from "@/utils/utils";

import { useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

import { CloudflareModelDialog } from "./cloudflare-model-dialog";
import {
  CF_LOCKED_KEY,
  CF_META_KEY,
  CLOUDFLARE_MODEL_NODE_TYPE,
  decodeCloudflareModelMeta,
  encodeCloudflareModelMeta,
  shortName,
} from "./cloudflare-model-utils";

interface CloudflareModelInputProps extends BaseWidgetProps {
  nodeId: string;
  model: string;
  hasSchemaParams: boolean;
  metaEncoded: string;
}

function CloudflareModelInputWidget({
  nodeId,
  model,
  hasSchemaParams,
  metaEncoded,
  className,
  disabled = false,
}: CloudflareModelInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingModel, setPendingModel] = useState<CloudflareModelInfo | null>(
    null
  );
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);
  const { updateNodeData, edges, deleteEdge } = useWorkflow();

  // Reconstruct the model info for the currently-selected model from the
  // metadata persisted on the node so a reload can re-fetch the same model's
  // schema (and refresh derived inputs/outputs) without re-opening the picker.
  const currentModelInfo = useMemo<CloudflareModelInfo | null>(() => {
    if (!model) return null;
    const meta = decodeCloudflareModelMeta(metaEncoded);
    return {
      id: model,
      name: model,
      description: meta.description,
      task: meta.taskName
        ? { id: meta.taskName, name: meta.taskName }
        : undefined,
    };
  }, [model, metaEncoded]);

  const applySchema = useCallback(
    async (info: CloudflareModelInfo) => {
      setLoading(true);
      setError(null);

      try {
        const schema = await makeRequest<CloudflareModelSchema>(
          `/cloudflare-ai/models/schema?model=${encodeURIComponent(info.name)}`
        );

        const modelParam: WorkflowParameter = {
          id: "model",
          name: "model",
          type: "string",
          description:
            "Cloudflare Workers AI model identifier (e.g., @cf/meta/llama-3.2-3b-instruct)",
          required: true,
          hidden: true,
          value: info.name,
        };

        const schemaInputs: WorkflowParameter[] = schema.inputs.map((p) => ({
          ...p,
          id: p.name,
        }));
        const schemaOutputs: WorkflowParameter[] = schema.outputs.map((p) => ({
          ...p,
          id: p.name,
        }));

        if (edges && deleteEdge) {
          for (const edge of edges) {
            if (edge.target === nodeId || edge.source === nodeId) {
              deleteEdge(edge.id);
            }
          }
        }

        // Persist per-model display metadata via the node's metadata bag so
        // the docs dialog can reconstruct description / documentation /
        // referenceUrl after a save round-trip without re-fetching the
        // catalog client-side. Picking a model on the fallback node never
        // sets `_cf_locked` — the picker stays available for further
        // switches.
        updateNodeData?.(nodeId, (current) => ({
          inputs: [modelParam, ...schemaInputs],
          outputs: schemaOutputs,
          metadata: {
            ...(current.metadata ?? {}),
            [CF_META_KEY]: encodeCloudflareModelMeta(info),
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

  const handleSelect = useCallback(
    (info: CloudflareModelInfo) => {
      if (info.name === model) return;
      if (hasSchemaParams) {
        setPendingModel(info);
      } else {
        applySchema(info);
      }
    },
    [model, hasSchemaParams, applySchema]
  );

  const handleConfirm = useCallback(() => {
    if (!pendingModel) return;
    const next = pendingModel;
    setPendingModel(null);
    applySchema(next);
  }, [pendingModel, applySchema]);

  // Re-fetch the selected model's schema, picking up any parameter changes
  // since it was last applied. Confirm first when rebuilding would clobber
  // existing schema-derived params and their connected edges.
  const handleReload = useCallback(() => {
    if (!currentModelInfo || disabled) return;
    if (hasSchemaParams) {
      setShowReloadConfirm(true);
    } else {
      applySchema(currentModelInfo);
    }
  }, [currentModelInfo, disabled, hasSchemaParams, applySchema]);

  const handleReloadConfirm = useCallback(() => {
    setShowReloadConfirm(false);
    if (currentModelInfo) applySchema(currentModelInfo);
  }, [currentModelInfo, applySchema]);

  return (
    <div className={cn("p-2 space-y-2", className)}>
      <div className="flex items-stretch gap-1">
        <Button
          variant="outline"
          onClick={() => setDialogOpen(true)}
          disabled={disabled || loading}
          className="h-auto flex-1 justify-between px-2 py-1.5 text-xs font-mono"
        >
          <span className={cn("truncate", !model && "text-muted-foreground")}>
            {model ? shortName(model) : "Select a model…"}
          </span>
          {loading ? (
            <LoaderCircle className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Search className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleReload}
          disabled={disabled || loading || !model}
          title="Reload model schema"
          className="h-auto px-2 shrink-0"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <CloudflareModelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleSelect}
        currentModel={model}
      />

      <AlertDialog
        open={pendingModel !== null}
        onOpenChange={(o) => !o && setPendingModel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace model schema?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to{" "}
              <code className="font-mono">{pendingModel?.name}</code> will
              replace all current parameters and remove connected edges. This
              cannot be undone.
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

      <AlertDialog open={showReloadConfirm} onOpenChange={setShowReloadConfirm}>
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
            <AlertDialogAction onClick={handleReloadConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const cloudflareModelInputWidget = createWidget({
  component: CloudflareModelInputWidget,
  nodeTypes: [CLOUDFLARE_MODEL_NODE_TYPE],
  inputField: "model",
  extractConfig: (nodeId, inputs, outputs, metadata) => {
    // Synthesized per-model nodes are locked to their identity — returning
    // null suppresses the widget entirely so the node body doesn't show a
    // model picker that would (destructively) swap its inputs/outputs.
    if (metadata?.[CF_LOCKED_KEY] === "true") return null;
    return {
      nodeId,
      model: getInputValue(inputs, "model", ""),
      hasSchemaParams: inputs.length > 1 || (outputs ?? []).length > 0,
      metaEncoded: metadata?.[CF_META_KEY] ?? "",
    };
  },
});
