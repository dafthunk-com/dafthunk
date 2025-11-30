import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";

import { CodeBlock } from "@/components/docs/code-block";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface GeoJSONPreviewWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function GeoJSONPreviewWidget({ value, className }: GeoJSONPreviewWidgetProps) {
  const hasValue = value !== undefined && value !== null;

  // Format GeoJSON value as pretty-printed JSON string
  const formatGeoJSON = (val: unknown): string => {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  // Render GeoJSON as SVG for visual preview
  const renderGeoJSONSvg = (geojson: unknown) => {
    if (!geojson) {
      return { svg: "", error: null };
    }

    try {
      const options: GeoJSONSvgOptions = {
        width: 400,
        height: 200,
        strokeColor: "#3b82f6",
        strokeWidth: 2,
        fillColor: "rgba(59, 130, 246, 0.2)",
        backgroundColor: "#f8fafc",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = geojsonToSvg(geojson as any, options);

      // Make SVG responsive
      if (result.svg && !result.error) {
        const responsiveSvg = result.svg
          .replace(/width="[^"]*"/, 'width="100%"')
          .replace(/height="[^"]*"/, 'height="auto"')
          .replace(
            /<svg([^>]*)>/,
            `<svg$1 viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">`
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
  const result = hasValue ? renderGeoJSONSvg(value) : { svg: "", error: null };

  return (
    <div className={cn("p-2 h-full w-full space-y-2", className)}>
      {/* SVG Preview */}
      <div className="border border-neutral-300 dark:border-neutral-700 rounded-md overflow-hidden h-[150px]">
        {result.error ? (
          <div className="h-full flex items-center justify-center text-xs text-red-500 p-2 bg-red-50 dark:bg-red-900/20">
            {result.error}
          </div>
        ) : result.svg ? (
          <div
            className="w-full h-full bg-neutral-50 dark:bg-neutral-900"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {hasValue ? "No geometries to display" : "No GeoJSON"}
            </span>
          </div>
        )}
      </div>

      {/* JSON Code Block */}
      {hasValue && (
        <div className="border border-neutral-300 dark:border-neutral-700 rounded-md overflow-hidden max-h-[150px] overflow-y-auto">
          <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
            {formattedValue}
          </CodeBlock>
        </div>
      )}
    </div>
  );
}

export const geojsonPreviewWidget = createWidget({
  component: GeoJSONPreviewWidget,
  nodeTypes: ["preview-geojson"],
  inputField: "value",
  extractConfig: (_nodeId, inputs, outputs) => {
    const displayValueOutput = outputs?.find((o) => o.name === "displayValue");
    const valueInput = inputs.find((i) => i.name === "value");

    const valueToPreview =
      displayValueOutput?.value !== undefined
        ? displayValueOutput.value
        : valueInput?.value;

    return {
      value: valueToPreview,
    };
  },
});
