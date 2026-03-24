import type { Field, FieldType, SchemaEntity } from "@dafthunk/types";
import PlusCircle from "lucide-react/icons/plus-circle";
import Trash2 from "lucide-react/icons/trash-2";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

const FIELD_TYPES: FieldType[] = [
  "string",
  "integer",
  "number",
  "boolean",
  "datetime",
  "json",
];

interface FieldEditorProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

function FieldEditor({ fields, onChange }: FieldEditorProps) {
  const addField = () => {
    onChange([...fields, { name: "", type: "string" }]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const nameCounts = new Map<string, number>();
  for (const f of fields) {
    const trimmed = f.name.trim();
    if (trimmed) {
      nameCounts.set(trimmed, (nameCounts.get(trimmed) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Fields</Label>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <PlusCircle className="mr-1 h-3 w-3" />
          Add Field
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No fields defined. Add at least one field.
        </p>
      )}
      {fields.map((field, index) => {
        const isDuplicate =
          field.name.trim() !== "" &&
          (nameCounts.get(field.name.trim()) ?? 0) > 1;
        return (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Field name"
              value={field.name}
              onChange={(e) => updateField(index, { name: e.target.value })}
              className={cn("flex-1", isDuplicate && "border-destructive")}
            />
            <Select
              value={field.type}
              onValueChange={(val) =>
                updateField(index, { type: val as FieldType })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Switch
                checked={field.required ?? false}
                onCheckedChange={(checked) =>
                  updateField(index, {
                    required: checked ? true : undefined,
                  })
                }
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground">Req</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeField(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export interface SchemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema?: SchemaEntity | null;
  onSubmit: (data: {
    name: string;
    description: string;
    fields: Field[];
  }) => Promise<void>;
  title: string;
  submitLabel: string;
}

export function SchemaDialog({
  open,
  onOpenChange,
  schema,
  onSubmit,
  title,
  submitLabel,
}: SchemaDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(schema?.name || "");
      setDescription(schema?.description || "");
      setFields(schema?.fields || [{ name: "", type: "string" }]);
    }
  }, [open, schema]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, fields });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldNames = fields.map((f) => f.name.trim());
  const hasDuplicateNames = new Set(fieldNames).size !== fieldNames.length;

  const isValid =
    name.trim().length > 0 &&
    fields.length > 0 &&
    fields.every((f) => f.name.trim().length > 0) &&
    !hasDuplicateNames;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="schema-name">Name</Label>
            <Input
              id="schema-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter schema name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="schema-description">Description</Label>
            <Textarea
              id="schema-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-2"
              rows={2}
            />
          </div>
          <FieldEditor fields={fields} onChange={setFields} />
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
