import File from "lucide-react/icons/file";

import { CodeBlock } from "@/components/docs/code-block";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ModelViewer } from "../model-viewer";
import { ClearButton } from "./clear-button";
import type { FieldWidgetProps } from "./types";

export function AnyFieldWidget({
  input,
  value,
  onChange,
  onClear,
  disabled,
  showClearButton,
  className,
  active,
  connected,
  createObjectUrl,
}: FieldWidgetProps & { createObjectUrl?: (objectReference: any) => string }) {
  const hasValue = value !== undefined && value !== null;

  // Handle object references (files)
  if (hasValue && isObjectReference(value)) {
    const objectUrl = createObjectUrl ? createObjectUrl(value) : null;
    const mimeType = (value as any)?.mimeType || "unknown type";

    // Images
    if (mimeType.startsWith("image/")) {
      return (
        <div className={cn("relative", className)}>
          {objectUrl && (
            <div
              className={cn(
                "relative rounded-md overflow-hidden bg-white dark:bg-neutral-950",
                active
                  ? "border border-blue-500"
                  : "border border-neutral-300 dark:border-neutral-700"
              )}
            >
              <img
                src={objectUrl}
                alt="Image"
                className="w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              {!disabled && showClearButton && (
                <ClearButton
                  onClick={onClear}
                  label="Clear image"
                  className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                />
              )}
            </div>
          )}
        </div>
      );
    }

    // Audio
    if (mimeType.startsWith("audio/")) {
      return (
        <div className={cn("relative", className)}>
          {objectUrl && (
            <>
              <audio controls className="w-full text-xs" preload="metadata">
                <source src={objectUrl} type={mimeType} />
              </audio>
              {!disabled && showClearButton && (
                <ClearButton
                  onClick={onClear}
                  label="Clear audio"
                  className="absolute top-0 right-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                />
              )}
            </>
          )}
        </div>
      );
    }

    // 3D Models
    if (mimeType === "model/gltf-binary" || mimeType === "model/gltf+json") {
      return (
        <div className={cn("relative", className)}>
          {objectUrl && (
            <>
              <ModelViewer parameter={input} objectUrl={objectUrl} />
              {!disabled && showClearButton && (
                <ClearButton
                  onClick={onClear}
                  label="Clear model"
                  className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                />
              )}
            </>
          )}
        </div>
      );
    }

    // Buffer Geometry
    if (mimeType === "application/x-buffer-geometry") {
      if (disabled) {
        return (
          <div className={cn("space-y-2", className)}>
            <div className="text-xs text-neutral-500">
              3D Geometry ({mimeType})
            </div>
            {objectUrl && (
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <File className="h-3 w-3" />
                Download Geometry Data
              </a>
            )}
          </div>
        );
      }
    }

    // Documents (PDF, etc)
    if (
      mimeType === "application/pdf" ||
      mimeType.startsWith("application/") ||
      mimeType.startsWith("text/")
    ) {
      if (disabled) {
        const isPDF = mimeType === "application/pdf";
        const isImage = mimeType.startsWith("image/");

        if (isPDF && objectUrl) {
          return (
            <div className={cn("relative", className)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500">PDF Document</span>
                <a
                  href={objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  View
                </a>
              </div>
              <iframe
                src={objectUrl}
                className="w-full h-64 rounded-md border nowheel"
              />
            </div>
          );
        }

        if (isImage && objectUrl) {
          return (
            <div className={cn("relative", className)}>
              <img
                src={objectUrl}
                alt="Document"
                className="w-full rounded-md border"
              />
            </div>
          );
        }
      }
    }

    // Fallback for unknown file types
    return (
      <div className={cn("space-y-2 relative", className)}>
        <div className="text-xs text-neutral-500">File ({mimeType})</div>
        {objectUrl && (
          <a
            href={objectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <File className="h-3 w-3" />
            View File
          </a>
        )}
        {!disabled && showClearButton && hasValue && (
          <ClearButton
            onClick={onClear}
            label="Clear file"
            className="absolute top-0 right-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          />
        )}
      </div>
    );
  }

  // No value
  if (!hasValue) {
    if (disabled) {
      return (
        <div
          className={cn(
            "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
            className
          )}
        >
          {connected ? "Connected" : "No value"}
        </div>
      );
    }
    return (
      <div className={cn("text-xs text-neutral-500 italic", className)}>
        No value
      </div>
    );
  }

  // Handle objects and arrays as JSON
  if (Array.isArray(value) || typeof value === "object") {
    const formattedValue = JSON.stringify(value, null, 2);

    if (disabled) {
      return (
        <div
          className={cn(
            "space-y-1 p-2 bg-muted/50 rounded-md border border-border",
            className
          )}
        >
          <div className="text-xs text-neutral-500">
            Any type (contains json)
          </div>
          <div className="border rounded-md bg-muted overflow-auto">
            <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
              {formattedValue}
            </CodeBlock>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("space-y-1 relative", className)}>
        <div className="text-xs text-neutral-500">Any type (contains json)</div>
        <Textarea
          value={formattedValue}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange?.(parsed);
            } catch {
              // Allow invalid JSON while typing
              onChange?.(e.target.value);
            }
          }}
          className={cn(
            "text-xs font-mono min-h-[100px] resize-y rounded-md",
            active && "border border-blue-500"
          )}
          placeholder="Enter JSON"
          disabled={disabled}
        />
        {!disabled && showClearButton && (
          <ClearButton
            onClick={onClear}
            label="Clear value"
            className="absolute top-7 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          />
        )}
      </div>
    );
  }

  // Handle primitive values (string, number, boolean)
  const actualType = typeof value;
  const stringValue = String(value);

  if (disabled) {
    return (
      <div
        className={cn(
          "space-y-1 p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        <div className="text-xs text-neutral-500">
          Any type (contains {actualType})
        </div>
        <div className="w-full p-2 bg-muted rounded-md border border-border whitespace-pre-line text-xs">
          {stringValue}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 relative", className)}>
      <div className="text-xs text-neutral-500">
        Any type (contains {actualType})
      </div>
      <Input
        value={stringValue}
        onChange={(e) => {
          const newValue = e.target.value;
          // Try to preserve type
          if (actualType === "number") {
            const num = Number(newValue);
            onChange?.(isNaN(num) ? newValue : num);
          } else if (actualType === "boolean") {
            onChange?.(newValue === "true");
          } else {
            onChange?.(newValue);
          }
        }}
        className={cn(
          "text-xs h-8 rounded-md",
          active && "border border-blue-500"
        )}
        placeholder={`Enter ${actualType} value`}
        disabled={disabled}
      />
      {!disabled && showClearButton && (
        <ClearButton
          onClick={onClear}
          label="Clear value"
          className="absolute top-7 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
