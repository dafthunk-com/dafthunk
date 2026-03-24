import type { Field, FieldType, GetSchemaResponse } from "@dafthunk/types";
import { useCallback, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { SchemaDialog } from "@/components/schema-dialog";
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

const CREATE_NEW = "__create_new__";

const FIELD_TYPE_TO_PARAMETER_TYPE: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  datetime: "date",
  json: "json",
};

interface SchemaExtractInputProps extends BaseWidgetProps {
  nodeId: string;
  schemaId: string;
  hasSchemaOutputs: boolean;
}

function SchemaExtractInputWidget({
  nodeId,
  schemaId,
  onChange,
  className,
  disabled = false,
}: SchemaExtractInputProps) {
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { schemas, isSchemasLoading, mutateSchemas } = useSchemas();
  const { organization } = useAuth();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();

  const applySchema = useCallback(
    async (selectedSchemaId: string) => {
      if (!organization?.id || !updateNodeData) return;

      // Persist the selected schema ID
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

        // Remove all edges connected to this node (schema change breaks connections)
        if (edges && deleteEdge) {
          for (const edge of edges) {
            if (edge.target === nodeId || edge.source === nodeId) {
              deleteEdge(edge.id);
            }
          }
        }

        updateNodeData(nodeId, {
          outputs: schemaOutputs,
        });
      } finally {
        setLoading(false);
      }
    },
    [organization?.id, updateNodeData, edges, deleteEdge, nodeId, onChange]
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

  const isLoading = loading || isSchemasLoading;
  const selectedName = schemas?.find((s) => s.id === schemaId)?.name;

  return (
    <div className={cn("p-2", className)}>
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

      <SchemaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title="Create New Schema"
        submitLabel="Create Schema"
      />
    </div>
  );
}

export const schemaExtractInputWidget = createWidget({
  component: SchemaExtractInputWidget,
  nodeTypes: ["json-schema-extract"],
  inputField: "schemaId",
  extractConfig: (nodeId, inputs, outputs) => ({
    nodeId,
    schemaId: getInputValue(inputs, "schemaId", ""),
    hasSchemaOutputs: (outputs ?? []).length > 0,
  }),
});
