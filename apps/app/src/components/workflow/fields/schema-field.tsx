import type { Field } from "@dafthunk/types";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { SchemaDialog } from "@/components/schema-dialog";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSchema, useSchemas } from "@/services/schema-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function SchemaField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { schemas, isSchemasLoading, mutateSchemas } = useSchemas();
  const { organization } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // If the value is an object (inline Schema from a node output), render as JSON
  const isInlineSchema = typeof value === "object" && value !== null;

  const jsonString = useMemo(() => {
    if (!isInlineSchema) return "";
    return JSON.stringify(value, null, 2);
  }, [isInlineSchema, value]);

  if (isInlineSchema) {
    return (
      <div
        className={cn("relative", className)}
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="h-[200px] rounded-md border border-border overflow-hidden bg-background">
          <CodeEditor
            value={jsonString}
            onChange={() => {}}
            language="json"
            readonly
          />
        </div>
      </div>
    );
  }

  const stringValue = String(value ?? "");

  const handleChange = (val: string) => {
    if (val === CREATE_NEW) {
      setIsCreateDialogOpen(true);
      return;
    }
    onChange(val || undefined);
  };

  const handleCreate = async (data: {
    name: string;
    description: string;
    fields: Field[];
  }) => {
    if (!organization?.id) return;
    const response = await createSchema(data, organization.id);
    await mutateSchemas();
    onChange(response.schema.id);
  };

  if (disabled) {
    const label = schemas?.find((s) => s.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No schema"}
            >
              {connected ? "Connected" : label || "No schema"}
            </SelectValue>
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={handleChange}
        disabled={isSchemasLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isSchemasLoading
                  ? "Loading..."
                  : schemas?.length === 0
                    ? "No schemas"
                    : "Select schema"
            }
          />
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
