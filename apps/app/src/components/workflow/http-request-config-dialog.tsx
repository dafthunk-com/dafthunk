import { File as FileIcon, PlusCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/utils";

type BodyType = "none" | "text" | "json" | "form-data" | "file";

interface KeyValue {
  key: string;
  value: string;
}

// Config submitted to execution
export interface HttpRequestConfig {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: string | File | FormData;
  contentType?: string;
}

interface HttpRequestConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: HttpRequestConfig) => void;
}

function ToggleButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1 text-sm font-medium rounded transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const addRow = () => onChange([...items, { key: "", value: "" }]);
  const removeRow = (index: number) =>
    onChange(items.filter((_, i) => i !== index));
  const updateRow = (index: number, field: "key" | "value", value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={item.key}
            onChange={(e) => updateRow(index, "key", e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1"
          />
          <Input
            value={item.value}
            onChange={(e) => updateRow(index, "value", e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => removeRow(index)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={addRow}
      >
        <PlusCircle className="w-4 h-4 mr-1" />
        Add
      </Button>
    </div>
  );
}

export function HttpRequestConfigDialog({
  isOpen,
  onClose,
  onSubmit,
}: HttpRequestConfigDialogProps) {
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [queryParams, setQueryParams] = useState<KeyValue[]>([]);
  const [bodyType, setBodyType] = useState<BodyType>("none");
  const [textBody, setTextBody] = useState("");
  const [jsonBody, setJsonBody] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formData, setFormData] = useState<KeyValue[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonChange = (value: string) => {
    setJsonBody(value);
    if (!value.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonBody);
      setJsonBody(JSON.stringify(parsed, null, 2));
    } catch {
      // Can't format invalid JSON
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toRecord = (items: KeyValue[]): Record<string, string> => {
    const record: Record<string, string> = {};
    items
      .filter((i) => i.key)
      .forEach(({ key, value }) => (record[key] = value));
    return record;
  };

  const handleSubmit = () => {
    const config: HttpRequestConfig = { method };

    const headersRecord = toRecord(headers);
    if (Object.keys(headersRecord).length > 0) {
      config.headers = headersRecord;
    }

    const queryRecord = toRecord(queryParams);
    if (Object.keys(queryRecord).length > 0) {
      config.queryParams = queryRecord;
    }

    if (method === "POST") {
      if (bodyType === "text" && textBody) {
        config.body = textBody;
        config.contentType = "text/plain";
      } else if (bodyType === "json" && jsonBody) {
        try {
          // Parse and re-stringify to validate and minify
          const parsed = JSON.parse(jsonBody);
          config.body = JSON.stringify(parsed);
          config.contentType = "application/json";
        } catch (e) {
          // Invalid JSON - show error and don't submit
          setJsonError(e instanceof Error ? e.message : "Invalid JSON");
          return;
        }
      } else if (bodyType === "form-data") {
        const fd = new FormData();
        formData
          .filter((i) => i.key)
          .forEach(({ key, value }) => fd.append(key, value));
        config.body = fd;
        config.contentType = "application/x-www-form-urlencoded";
      } else if (bodyType === "file" && file) {
        config.body = file;
        config.contentType = file.type || "application/octet-stream";
      }
    }

    onSubmit(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Execute Workflow
          </DialogTitle>
          <ToggleButtons
            value={method}
            options={[
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
            ]}
            onChange={setMethod}
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Headers */}
            <div className="space-y-2">
              <Label>Headers</Label>
              <KeyValueEditor
                items={headers}
                onChange={setHeaders}
                keyPlaceholder="Header name"
                valuePlaceholder="Value"
              />
            </div>

            {/* Query Parameters */}
            <div className="space-y-2">
              <Label>Query Parameters</Label>
              <KeyValueEditor
                items={queryParams}
                onChange={setQueryParams}
                keyPlaceholder="Parameter"
                valuePlaceholder="Value"
              />
            </div>

            {/* Body (POST only) */}
            {method === "POST" && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label>Body</Label>
                  <ToggleButtons
                    value={bodyType}
                    options={[
                      { value: "none", label: "None" },
                      { value: "text", label: "Text" },
                      { value: "json", label: "JSON" },
                      { value: "form-data", label: "Form" },
                      { value: "file", label: "File" },
                    ]}
                    onChange={setBodyType}
                  />
                </div>

                {bodyType === "text" && (
                  <div className="h-[160px] border rounded-md overflow-hidden">
                    <CodeEditor
                      value={textBody}
                      onChange={setTextBody}
                      language="text"
                    />
                  </div>
                )}

                {bodyType === "json" && (
                  <div className="space-y-1">
                    <div
                      className={cn(
                        "h-[160px] border rounded-md overflow-hidden relative",
                        jsonError && "border-destructive"
                      )}
                    >
                      <CodeEditor
                        value={jsonBody}
                        onChange={handleJsonChange}
                        language="json"
                      />
                      {jsonBody && !jsonError && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-6 px-2 text-xs text-muted-foreground"
                          onClick={formatJson}
                        >
                          Format
                        </Button>
                      )}
                    </div>
                    {jsonError && (
                      <p className="text-xs text-destructive">{jsonError}</p>
                    )}
                  </div>
                )}

                {bodyType === "form-data" && (
                  <KeyValueEditor
                    items={formData}
                    onChange={setFormData}
                    keyPlaceholder="Field"
                    valuePlaceholder="Value"
                  />
                )}

                {bodyType === "file" && (
                  <>
                    {file ? (
                      <div className="flex items-center justify-between p-2 bg-muted/50 border rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleRemoveFile}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Upload file
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            Execute
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
