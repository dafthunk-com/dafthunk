import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function GeoJSONField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
}: FieldProps) {
  // GeoJSON fields check for null explicitly (null is a valid but empty GeoJSON)
  const hasValue = value !== undefined && value !== null;

  const readonly = disabled ?? false;

  // Convert value to string for display
  const stringValue = useMemo(() => {
    if (!hasValue) return "";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }, [value, hasValue]);

  // Check if current value is valid JSON
  const isValidJson = useMemo(() => {
    if (!stringValue) return false;
    try {
      JSON.parse(stringValue);
      return true;
    } catch {
      return false;
    }
  }, [stringValue]);

  // Render GeoJSON as SVG for visual preview
  const svgResult = useMemo(() => {
    if (!hasValue || !value) {
      return { svg: "", error: null };
    }

    try {
      const options: GeoJSONSvgOptions = {
        width: 400,
        height: 300,
        strokeColor: "#3b82f6",
        strokeWidth: 2,
        fillColor: "rgba(59, 130, 246, 0.2)",
        backgroundColor: "#f8fafc",
      };

      const result = geojsonToSvg(
        value as Parameters<typeof geojsonToSvg>[0],
        options
      );

      // Make SVG responsive with 100% width
      if (result.svg && !result.error) {
        const responsiveSvg = result.svg
          .replace(/width="[^"]*"/, 'width="100%"')
          .replace(/height="[^"]*"/, 'height="auto"')
          .replace(
            /<svg([^>]*)>/,
            `<svg$1 viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">`
          );

        return { svg: responsiveSvg, error: result.error };
      }

      return { svg: result.svg, error: result.error };
    } catch (err) {
      console.error("Error rendering GeoJSON:", err);
      return {
        svg: "",
        error: `Error rendering GeoJSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }, [value, hasValue]);

  const handleChange = (newValue: string) => {
    if (!newValue) {
      onChange?.(undefined);
      return;
    }
    onChange?.(newValue);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(stringValue);
      onChange?.(JSON.stringify(parsed, null, 2));
    } catch {
      // Can't format invalid JSON
    }
  };

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-start justify-start p-2 rounded-md">
          <span className="text-neutral-500 dark:text-neutral-400 text-xs">
            {connected ? "Connected" : "No preview"}
          </span>
        </div>
        <div className="h-[200px] flex items-start justify-start text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border">
          {connected ? "Connected" : "No GeoJSON"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview above editor - always visible with 200px height */}
      {svgResult.error ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-red-500 p-2 bg-red-50 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800 rounded-md">
          {svgResult.error}
        </div>
      ) : svgResult.svg ? (
        <div className="h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center rounded-md">
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: svgResult.svg }}
          />
        </div>
      ) : (
        <div className="h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center rounded-md">
          <span className="text-neutral-500 dark:text-neutral-400 text-xs">
            {hasValue ? "No geometries to display" : "No GeoJSON"}
          </span>
        </div>
      )}

      {/* CodeEditor */}
      <div
        className="relative"
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="min-h-[80px] max-h-[200px] rounded-md border border-border overflow-hidden">
          <CodeEditor
            value={stringValue}
            onChange={handleChange}
            language="json"
            readonly={readonly}
          />
        </div>
        {!disabled && !readonly && isValidJson && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 px-2 text-xs text-muted-foreground z-10"
            onClick={formatJson}
          >
            Format
          </Button>
        )}
        {!disabled && !readonly && clearable && hasValue && (
          <ClearButton
            onClick={onClear}
            label="Clear GeoJSON"
            className="absolute top-1 right-16 z-10"
          />
        )}
      </div>
    </div>
  );
}
