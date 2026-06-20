import type { Field, FieldType, GetSchemaResponse } from "@dafthunk/types";
import LoaderCircle from "lucide-react/icons/loader-circle";
import RotateCw from "lucide-react/icons/rotate-cw";
import { useCallback, useState } from "react";

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
};

interface SchemaComposeInputProps extends BaseWidgetProps {
  nodeId: string;
  schemaId: string;
  hasSchemaInputs: boolean;
  storedHash: string;
}

function SchemaComposeInputWidget({
  nodeId,
  schemaId,
  hasSchemaInputs,
  storedHash,
  className,
  disabled = false,
}: SchemaComposeInputProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { schemas, isSchemasLoading, mutateSchemas } = useSchemas();
  const { organization } = useAuth();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();

  const applySchema = useCallback(
    async (selectedSchemaId: string) => {
      if (!organization?.id || !updateNodeData) return;

      setLoading(true);
      try {
        const response = await makeOrgRequest<GetSchemaResponse>(
          organization.id,
          "/schemas",
          `/${selectedSchemaId}`
        );

        const fieldInputs = response.schema.fields.map(
          (field) =>
            ({
              id: field.name,
              name: field.name,
              type: FIELD_TYPE_TO_PARAMETER_TYPE[field.type] ?? "any",
            }) as WorkflowParameter
        );

        // Remove all edges connected to this node (schema change breaks connections)
        if (edges && deleteEdge) {
          for (const edge of edges) {
            if (edge.target === nodeId || edge.source === nodeId) {
              deleteEdge(edge.id);
            }
          }
        }

        // Stamp the field-shape signature so the widget can later detect when
        // the source schema has drifted from these derived inputs.
        const fieldsHash = hashSchemaFields(response.schema.fields);

        // Build the schema input from scratch to avoid race conditions
        // between competing input updates (onChange vs updateNodeData)
        updateNodeData(nodeId, (current) => {
          const existingSchema = current.inputs?.find((i) => i.id === "schema");
          const schemaInput = {
            ...(existingSchema ?? {
              id: "schema",
              name: "schema",
              type: "schema" as const,
              hidden: true,
              required: true,
            }),
            value: selectedSchemaId,
          } as WorkflowParameter;
          return {
            inputs: [schemaInput, ...fieldInputs],
            metadata: {
              ...(current.metadata ?? {}),
              [SCHEMA_FIELDS_HASH_KEY]: fieldsHash,
            },
          };
        });

        // Refresh the cached schema list so the drift check baseline matches
        // what we just applied (otherwise a stale list flags a false drift).
        await mutateSchemas();
      } finally {
        setLoading(false);
      }
    },
    [organization?.id, updateNodeData, edges, deleteEdge, nodeId, mutateSchemas]
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

  // Re-derive the inputs from the currently selected schema, picking up any
  // field changes made to the schema since it was last applied.
  const handleReload = useCallback(() => {
    if (!schemaId || disabled) return;
    if (hasSchemaInputs) {
      setShowConfirm(true);
    } else {
      applySchema(schemaId);
    }
  }, [schemaId, disabled, hasSchemaInputs, applySchema]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    applySchema(schemaId);
  }, [schemaId, applySchema]);

  const isLoading = loading || isSchemasLoading;
  const selectedSchema = schemas?.find((s) => s.id === schemaId);
  const selectedName = selectedSchema?.name;

  // Drift between the schema's current field shape and the shape these inputs
  // were last derived from. Legacy nodes without a stored hash can't be judged,
  // so they aren't flagged.
  const currentHash = selectedSchema
    ? hashSchemaFields(selectedSchema.fields)
    : "";
  const isStale =
    hasSchemaInputs &&
    !!storedHash &&
    !!currentHash &&
    storedHash !== currentHash;

  return (
    <div className={cn("p-2", className)}>
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
            isStale ? "Schema changed — reload to sync inputs" : "Reload schema"
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
              This will rebuild the inputs from the schema and remove all
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

export const schemaComposeInputWidget = createWidget({
  component: SchemaComposeInputWidget,
  nodeTypes: ["json-schema-compose"],
  inputField: "schema",
  extractConfig: (nodeId, inputs, _outputs, metadata) => ({
    nodeId,
    schemaId: getInputValue(inputs, "schema", ""),
    hasSchemaInputs: (inputs ?? []).length > 1,
    storedHash: metadata?.[SCHEMA_FIELDS_HASH_KEY] ?? "",
  }),
});
