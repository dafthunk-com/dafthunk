import { type FieldType, isBlobFieldType } from "@dafthunk/types";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * A single schema field as rendered on a public form. `type` is the schema
 * FieldType string; blob types render as file inputs.
 */
export interface SchemaFormField {
  name: string;
  type: string;
  required?: boolean;
  label?: string;
  defaultValue?: string;
}

/** True when any field holds a file (so the form must submit multipart). */
export function hasFileFields(fields: SchemaFormField[]): boolean {
  return fields.some((f) => isBlobFieldType(f.type as FieldType));
}

/** Whether all required fields have a value (files count as present). */
export function isFormValid(
  fields: SchemaFormField[],
  values: Record<string, unknown>
): boolean {
  return fields
    .filter((f) => f.required)
    .every((f) => {
      const v = values[f.name];
      return v !== undefined && v !== null && v !== "";
    });
}

/**
 * Submits a schema form to `url`. Sends multipart/form-data when files are
 * present (non-file values in a `_data` JSON part), otherwise plain JSON.
 */
export function submitSchemaForm(
  url: string,
  fields: SchemaFormField[],
  values: Record<string, unknown>
): Promise<Response> {
  if (!hasFileFields(fields)) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }

  const formData = new FormData();
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const v = values[field.name];
    if (isBlobFieldType(field.type as FieldType)) {
      if (v instanceof File) formData.append(field.name, v);
    } else if (v !== undefined) {
      data[field.name] = v;
    }
  }
  formData.append("_data", JSON.stringify(data));
  // No explicit Content-Type — the browser sets the multipart boundary.
  return fetch(url, { method: "POST", body: formData });
}

/**
 * Renders a single schema field input. Shared by the human-in-the-loop form
 * page and the form-trigger page.
 */
export function SchemaFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: SchemaFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const displayLabel = field.label || field.name;

  if (isBlobFieldType(field.type as FieldType)) {
    const accept =
      field.type === "image"
        ? "image/*"
        : field.type === "audio"
          ? "audio/*"
          : field.type === "video"
            ? "video/*"
            : undefined;
    const file = value instanceof File ? value : null;
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>
          {displayLabel}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id={field.name}
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] ?? undefined)}
          disabled={disabled}
        />
        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
      </div>
    );
  }

  switch (field.type) {
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <Switch
            id={field.name}
            checked={!!value}
            onCheckedChange={onChange}
            disabled={disabled}
          />
          <Label htmlFor={field.name}>{displayLabel}</Label>
        </div>
      );

    case "number":
    case "integer":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={field.name}
            type="number"
            step={field.type === "integer" ? "1" : "any"}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                onChange(undefined);
              } else {
                onChange(
                  field.type === "integer" ? parseInt(v, 10) : parseFloat(v)
                );
              }
            }}
            disabled={disabled}
          />
        </div>
      );

    case "datetime":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={field.name}
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            disabled={disabled}
          />
        </div>
      );

    case "json":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={field.name}
            placeholder="Enter JSON..."
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            rows={3}
            className="font-mono text-sm"
            disabled={disabled}
          />
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={field.name}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            disabled={disabled}
          />
        </div>
      );
  }
}
