import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";

import { CodeBlock } from "@/components/docs/code-block";
import { Textarea } from "@/components/ui/textarea";
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
  parameter,
  value,
}: FieldProps) {
  // GeoJSON fields check for null explicitly (null is a valid but empty GeoJSON)
  const hasValue = value !== undefined && value !== null;

  // Helper to get human-readable label for geometry type
  const getGeometryTypeLabel = (type: string): string => {
    switch (type) {
      case "point":
        return "Point";
      case "multipoint":
        return "MultiPoint";
      case "linestring":
        return "LineString";
      case "multilinestring":
        return "MultiLineString";
      case "polygon":
        return "Polygon";
      case "multipolygon":
        return "MultiPolygon";
      case "geometry":
        return "Geometry";
      case "geometrycollection":
        return "GeometryCollection";
      case "feature":
        return "Feature";
      case "featurecollection":
        return "FeatureCollection";
      default:
        return "GeoJSON";
    }
  };

  // Helper to format GeoJSON value as pretty-printed JSON string
  const formatGeoJSON = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      console.warn("Error formatting GeoJSON:", e);
      return String(value);
    }
  };

  // Helper to render GeoJSON as SVG for visual preview
  const renderGeoJSONSvg = (geojson: any) => {
    if (!geojson) {
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

      const result = geojsonToSvg(geojson, options);

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
  };

  const formattedValue = hasValue ? formatGeoJSON(value) : "";
  const geometryLabel = getGeometryTypeLabel(parameter.type);

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No GeoJSON"}
      </div>
    );
  }

  // Disabled state with value - show SVG preview and JSON code block
  if (disabled) {
    const result = hasValue
      ? renderGeoJSONSvg(value)
      : { svg: "", error: null };

    return (
      <div className={cn("space-y-2", className)}>
        {/* Preview above JSON */}
        <>
          {result.error ? (
            <div className="text-xs text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
              {result.error}
            </div>
          ) : result.svg ? (
            <div className="border border-border rounded-md bg-slate-50 dark:bg-slate-900">
              <div
                className="w-full"
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />
            </div>
          ) : hasValue ? (
            <div className="border border-border rounded-md bg-slate-50 dark:bg-slate-900 p-4 text-center">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                No geometries to display
              </span>
            </div>
          ) : null}
        </>

        {/* JSON Code Block */}
        {hasValue && (
          <div className="border border-border rounded-md bg-muted/50 overflow-auto">
            <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
              {formattedValue}
            </CodeBlock>
          </div>
        )}
      </div>
    );
  }

  // Enabled state - show SVG preview (if has value) and editable textarea
  const result = hasValue ? renderGeoJSONSvg(value) : { svg: "", error: null };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview above textarea */}
      {hasValue && (
        <>
          {result.error ? (
            <div className="text-xs text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
              {result.error}
            </div>
          ) : result.svg ? (
            <div className="border border-border rounded-md bg-slate-50 dark:bg-slate-900">
              <div
                className="w-full"
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />
            </div>
          ) : (
            <div className="border border-border rounded-md bg-slate-50 dark:bg-slate-900 p-4 text-center">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                No geometries to display
              </span>
            </div>
          )}
        </>
      )}

      {/* Textarea input */}
      <div className="relative">
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
          placeholder={`Enter ${geometryLabel} GeoJSON`}
          className={cn(
            "text-xs font-mono min-h-[120px] resize-y rounded-md border border-neutral-300 dark:border-neutral-700"
          )}
          disabled={disabled}
        />
        {!disabled && clearable && hasValue && (
          <ClearButton
            onClick={onClear}
            label="Clear GeoJSON"
            className="absolute top-2 right-1"
          />
        )}
      </div>
    </div>
  );
}
