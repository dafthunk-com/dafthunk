import type { Field, FieldType, GetSchemaResponse } from "@dafthunk/types";
import Copy from "lucide-react/icons/copy";
import ExternalLink from "lucide-react/icons/external-link";
import LoaderCircle from "lucide-react/icons/loader-circle";
import RotateCw from "lucide-react/icons/rotate-cw";
import { useCallback, useState } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { SchemaDialog } from "@/components/schema-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchemas } from "@/services/schema-service";
import { makeOrgRequest } from "@/services/utils";
import { cn } from "@/utils/utils";

import { useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

import { hashSchemaFields, SCHEMA_FIELDS_HASH_KEY } from "./schema-fields-hash";

const CREATE_NEW = "__create_new__";

const FIELD_TYPE_TO_PARAMETER_TYPE: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  datetime: "date",
  json: "json",
  image: "image",
  document: "document",
  audio: "audio",
  video: "video",
  blob: "blob",
};

interface FormTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  schemaId: string;
  hasSchemaOutputs: boolean;
  storedHash: string;
}

/**
 * Widget for the form trigger nodes. Picking a schema derives the node's typed
 * outputs (one per field, with drift detection) — like the schema-extract
 * widget — and surfaces the public form URL `/forms/:workflowId` to share.
 */
function FormTriggerInputWidget({
  nodeId,
  schemaId,
  hasSchemaOutputs,
  storedHash,
  onChange,
  className,
  disabled = false,
}: FormTriggerInputProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { schemas, isSchemasLoading, mutateSchemas } = useSchemas();
  const { organization } = useAuth();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const { id: workflowId } = useParams<{ id: string }>();

  const formUrl = workflowId
    ? `${window.location.origin}/forms/${workflowId}`
    : "";

  const applySchema = useCallback(
    async (selectedSchemaId: string) => {
      if (!organization?.id || !updateNodeData) return;

      onChange(selectedSchemaId);
      setLoading(true);
      try {
        const response = await makeOrgRequest<GetSchemaResponse>(
          organization.id,
          "/schemas",
          `/${selectedSchemaId}`
        );

        const schemaOutputs = response.schema.fields.map(
          (field) =>
            ({
              id: field.name,
              name: field.name,
              type: FIELD_TYPE_TO_PARAMETER_TYPE[field.type] ?? "any",
            }) as WorkflowParameter
        );

        // Schema change breaks existing connections.
        if (edges && deleteEdge) {
          for (const edge of edges) {
            if (edge.target === nodeId || edge.source === nodeId) {
              deleteEdge(edge.id);
            }
          }
        }

        const fieldsHash = hashSchemaFields(response.schema.fields);
        updateNodeData(nodeId, (current) => ({
          outputs: schemaOutputs,
          metadata: {
            ...(current.metadata ?? {}),
            [SCHEMA_FIELDS_HASH_KEY]: fieldsHash,
          },
        }));

        await mutateSchemas();
      } finally {
        setLoading(false);
      }
    },
    [
      organization?.id,
      updateNodeData,
      edges,
      deleteEdge,
      nodeId,
      onChange,
      mutateSchemas,
    ]
  );

  const handleChange = useCallback(
    (val: string) => {
      if (val === CREATE_NEW) {
        setIsCreateDialogOpen(true);
        return;
      }
      applySchema(val);
    },
    [applySchema]
  );

  const handleCreate = useCallback(
    async (data: { name: string; description: string; fields: Field[] }) => {
      if (!organization?.id) return;
      const { createSchema } = await import("@/services/schema-service");
      const response = await createSchema(data, organization.id);
      await mutateSchemas();
      applySchema(response.schema.id);
    },
    [organization?.id, mutateSchemas, applySchema]
  );

  const handleReload = useCallback(() => {
    if (!schemaId || disabled) return;
    if (hasSchemaOutputs) {
      setShowConfirm(true);
    } else {
      applySchema(schemaId);
    }
  }, [schemaId, disabled, hasSchemaOutputs, applySchema]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    applySchema(schemaId);
  }, [schemaId, applySchema]);

  const isLoading = loading || isSchemasLoading;
  const selectedSchema = schemas?.find((s) => s.id === schemaId);
  const selectedName = selectedSchema?.name;

  const currentHash = selectedSchema
    ? hashSchemaFields(selectedSchema.fields)
    : "";
  const isStale =
    hasSchemaOutputs &&
    !!storedHash &&
    !!currentHash &&
    storedHash !== currentHash;

  return (
    <div className={cn("p-2", className)}>
      {formUrl && (
        <div className="mb-2 flex items-center gap-1">
          <Button
            variant="outline"
            className="h-auto flex-1 gap-1.5 text-xs"
            title={formUrl}
            onClick={() => window.open(formUrl, "_blank", "noopener")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-1 gap-1.5 text-xs"
            title={formUrl}
            onClick={() => navigator.clipboard.writeText(formUrl)}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
      )}

      <div className="flex items-stretch gap-1">
        <Select
          value={schemaId || ""}
          onValueChange={handleChange}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="h-auto text-xs">
            <SelectValue
              placeholder={
                isLoading
                  ? "Loading..."
                  : schemas?.length === 0
                    ? "No schemas"
                    : "Select schema"
              }
            >
              {selectedName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {schemas?.map((schema) => (
              <SelectItem key={schema.id} value={schema.id} className="text-xs">
                {schema.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={CREATE_NEW} className="text-xs">
              + New Schema
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={handleReload}
          disabled={disabled || isLoading || !schemaId}
          title={
            isStale
              ? "Schema changed — reload to sync outputs"
              : "Reload schema"
          }
          className={cn("h-auto px-2 shrink-0", isStale && "border-amber-500")}
        >
          {loading ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <SchemaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title="Create New Schema"
        submitLabel="Create Schema"
      />

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reload schema?</AlertDialogTitle>
            <AlertDialogDescription>
              This will rebuild the outputs from the schema and remove all
              connected edges. This action cannot be undone.
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

export const formTriggerInputWidget = createWidget({
  component: FormTriggerInputWidget,
  nodeTypes: ["form-request", "form-webhook"],
  inputField: "schema",
  extractConfig: (nodeId, inputs, outputs, metadata) => ({
    nodeId,
    schemaId: getInputValue(inputs, "schema", ""),
    hasSchemaOutputs: (outputs ?? []).length > 0,
    storedHash: metadata?.[SCHEMA_FIELDS_HASH_KEY] ?? "",
  }),
});
