import { ObjectReference } from "@dafthunk/types";
import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";
import React, { useEffect, useRef, useState } from "react";

import { CodeBlock } from "@/components/docs/code-block";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isObjectReference } from "@/services/object-service";

import { ModelViewer } from "./model-viewer";
import { WorkflowParameter } from "./workflow-types";

interface WorkflowValueRendererProps {
  parameter: WorkflowParameter;
  createObjectUrl?: (objectReference: ObjectReference) => string;
  disabled?: boolean;
  onChange?: (value: any) => void;
}

// Format value for display
export const formatValue = (value: any, type: string): string => {
  if (value === undefined || value === null) return "";

  try {
    if (type === "audio" || type === "image" || type === "document") {
      return ""; // Don't display data as text for types handled by dedicated renderers
    } else if (type === "json") {
      return JSON.stringify(value, null, 2);
    } else if (type === "boolean") {
      return value ? "true" : "false";
    } else if (type === "number") {
      return value.toString();
    } else if (type === "string") {
      return String(value);
    }
    return String(value);
  } catch (e) {
    console.warn("Error formatting value:", e);
    return String(value);
  }
};

// Image renderer
const ImageRenderer = ({
  parameter,
  objectUrl,
  disabled,
}: {
  parameter: WorkflowParameter;
  objectUrl: string;
  disabled?: boolean;
}) => (
  <div className="relative">
    <img
      src={objectUrl}
      alt={`${parameter.name} ${disabled ? "output" : "input"}`}
      className="w-full rounded-md border"
      onError={(e) => {
        console.error("Error loading image:", e);
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling?.classList.remove("hidden");
      }}
    />
    <div className="hidden text-xs text-red-500 p-2 bg-red-50 rounded-md mt-1 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
      Error displaying image. The data may be corrupted.
    </div>
  </div>
);

// Audio renderer
const AudioRenderer = ({
  audioUrl,
  onError,
  audioRef,
}: {
  audioUrl: string;
  onError: (e: React.SyntheticEvent<HTMLAudioElement, Event>) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}) => (
  <audio
    ref={audioRef}
    controls
    className="w-full"
    src={audioUrl}
    onError={onError}
  />
);

// Document renderer
const DocumentRenderer = ({
  parameter,
  objectUrl,
}: {
  parameter: WorkflowParameter;
  objectUrl: string;
}) => {
  const isPDF = parameter.value.mimeType === "application/pdf";
  const isImage = parameter.value.mimeType.startsWith("image/");

  if (isPDF) {
    return (
      <div className="relative">
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

  if (isImage) {
    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">Document (Image)</span>
          <a
            href={objectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            View
          </a>
        </div>
        <img
          src={objectUrl}
          alt={`${parameter.name} document`}
          className="w-full rounded-md border"
        />
      </div>
    );
  }

  // For other document types, just show a link
  return (
    <div className="relative">
      <a
        href={objectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:underline flex items-center"
      >
        View Document ({parameter.value.mimeType.split("/")[1]})
      </a>
    </div>
  );
};

// Geometry renderer for GeoJSON geometries
const GeoJSONRenderer = ({
  parameter,
  disabled,
  onChange,
}: {
  parameter: WorkflowParameter;
  disabled?: boolean;
  onChange?: (value: any) => void;
}) => {
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

  const formatGeoJSON = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      console.warn("Error formatting GeoJSON:", e);
      return String(value);
    }
  };

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

  const formattedValue = formatGeoJSON(parameter.value);
  const geometryLabel = getGeometryTypeLabel(parameter.type);

  if (disabled) {
    const result = renderGeoJSONSvg(parameter.value);

    return (
      <div className="space-y-2">
        {result.error ? (
          <div className="text-xs text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
            {result.error}
          </div>
        ) : result.svg ? (
          <div className="border rounded-md bg-slate-50 dark:bg-slate-900">
            <div
              className="w-full"
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
          </div>
        ) : (
          <div className="border rounded-md bg-slate-50 dark:bg-slate-900 p-4 text-center">
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              No geometries to display
            </span>
          </div>
        )}
        <CodeRenderer
          value={formattedValue}
          type="json"
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parameter.value &&
        (() => {
          const result = renderGeoJSONSvg(parameter.value);

          if (result.error) {
            return (
              <div className="text-xs text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
                {result.error}
              </div>
            );
          }

          if (result.svg) {
            return (
              <div className="border rounded-md bg-slate-50 dark:bg-slate-900">
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: result.svg }}
                />
              </div>
            );
          }

          return (
            <div className="border rounded-md bg-slate-50 dark:bg-slate-900 p-4 text-center">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                No geometries to display
              </span>
            </div>
          );
        })()}

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
        className="text-xs font-mono min-h-[120px]"
        placeholder={`Enter ${geometryLabel} GeoJSON`}
      />
    </div>
  );
};

// Code renderer for JSON, arrays, and other code-like content
const CodeRenderer = ({
  value,
  type,
  disabled,
  onChange,
}: {
  value: string;
  type: string;
  disabled?: boolean;
  onChange?: (value: any) => void;
}) => {
  // Determine the language based on the type
  const getLanguage = (type: string): string => {
    switch (type) {
      case "json":
        return "json";
      case "javascript":
      case "js":
        return "javascript";
      case "typescript":
      case "ts":
        return "typescript";
      case "python":
      case "py":
        return "python";
      case "html":
        return "html";
      case "css":
        return "css";
      case "sql":
        return "sql";
      case "yaml":
      case "yml":
        return "yaml";
      case "xml":
        return "xml";
      default:
        return "text";
    }
  };

  if (disabled) {
    return (
      <div className="border rounded-md bg-muted overflow-auto">
        <CodeBlock
          language={getLanguage(type)}
          className="text-xs my-0 [&_pre]:p-2"
        >
          {value}
        </CodeBlock>
      </div>
    );
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="text-xs font-mono min-h-[100px]"
      placeholder={`Enter ${type} value`}
    />
  );
};

// Text renderer for simple text content
const TextRenderer = ({
  value,
  type,
  disabled,
  onChange,
}: {
  value: string;
  type: string;
  disabled?: boolean;
  onChange?: (value: any) => void;
}) => {
  if (disabled) {
    return (
      <div className="w-full p-2 bg-secondary/50 rounded-md border border-border whitespace-pre-line text-xs">
        {value}
      </div>
    );
  }

  if (type === "string") {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`text-xs min-h-[80px] resize-y ${
          disabled ? "opacity-70 cursor-not-allowed" : ""
        }`}
        disabled={disabled}
        placeholder={`Enter ${type} value`}
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`text-xs h-8 ${
        disabled ? "opacity-70 cursor-not-allowed" : ""
      }`}
      disabled={disabled}
      placeholder={`Enter ${type} value`}
    />
  );
};

export function WorkflowValueRenderer({
  parameter,
  createObjectUrl,
  disabled = false,
  onChange,
}: WorkflowValueRendererProps) {
  const [_error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset error state when parameter changes
    setError(null);
  }, [parameter]);

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    console.error("Audio playback error:", e);
    if (audioRef.current) {
      console.log("Audio element error:", audioRef.current.error);
      const errorMessage =
        audioRef.current.error?.message || "Unknown audio playback error";
      setError(`Error playing audio: ${errorMessage}`);
    }
  };

  if (
    (parameter.value === null || parameter.value === undefined) &&
    !onChange
  ) {
    return (
      <div className="w-full p-2 bg-secondary/50 rounded-md border border-border text-xs">
        No value
      </div>
    );
  }

  // Handle object references (files, images, etc.)
  if (
    parameter.value &&
    isObjectReference(parameter.value) &&
    createObjectUrl
  ) {
    const objectUrl = createObjectUrl(parameter.value);

    switch (parameter.type) {
      case "image":
        return (
          <ImageRenderer
            parameter={parameter}
            objectUrl={objectUrl}
          />
        );
      case "audio":
        return (
          <AudioRenderer
            audioUrl={objectUrl}
            onError={handleAudioError}
            audioRef={audioRef}
          />
        );
      case "document":
        return (
          <DocumentRenderer
            parameter={parameter}
            objectUrl={objectUrl}
          />
        );
      case "buffergeometry":
        return (
          <div className="space-y-2">
            <div className="text-xs text-neutral-500">
              3D Geometry ({parameter.value.mimeType})
            </div>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center"
            >
              Download Geometry Data
            </a>
          </div>
        );
      case "gltf":
        return (
          <ModelViewer
            parameter={parameter}
            objectUrl={objectUrl}
          />
        );
      case "point":
      case "multipoint":
      case "linestring":
      case "multilinestring":
      case "polygon":
      case "multipolygon":
      case "geometry":
      case "geometrycollection":
      case "feature":
      case "featurecollection":
      case "geojson":
        return (
          <GeoJSONRenderer
            parameter={parameter}
            disabled={disabled}
            onChange={onChange}
          />
        );
      case "any":
        // For "any" type with object reference, try to determine the best renderer
        // based on the object reference properties
        if (parameter.value.mimeType) {
          if (parameter.value.mimeType.startsWith("image/")) {
            return (
              <ImageRenderer
                parameter={parameter}
                objectUrl={objectUrl}
              />
            );
          }
          if (parameter.value.mimeType.startsWith("audio/")) {
            return (
              <AudioRenderer
                audioUrl={objectUrl}
                onError={handleAudioError}
                audioRef={audioRef}
              />
            );
          }
          if (parameter.value.mimeType === "application/x-buffer-geometry") {
            return (
              <div className="space-y-2">
                <div className="text-xs text-neutral-500">
                  3D Geometry ({parameter.value.mimeType})
                </div>
                <a
                  href={objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center"
                >
                  Download Geometry Data
                </a>
              </div>
            );
          }
          if (parameter.value.mimeType === "model/gltf-binary") {
            return (
              <ModelViewer
                parameter={parameter}
                objectUrl={objectUrl}
              />
            );
          }
          if (
            parameter.value.mimeType === "application/pdf" ||
            parameter.value.mimeType.startsWith("application/") ||
            parameter.value.mimeType.startsWith("text/")
          ) {
            return (
              <DocumentRenderer
                parameter={parameter}
                objectUrl={objectUrl}
              />
            );
          }
        }
        // Fallback for any type with object reference
        return (
          <div className="space-y-2">
            <div className="text-xs text-neutral-500">
              File ({parameter.value.mimeType || "unknown type"})
            </div>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center"
            >
              View File
            </a>
          </div>
        );
      default:
        return (
          <div className="text-xs text-orange-500">
            Unsupported object type: {parameter.type}
          </div>
        );
    }
  }

  // Handle geometry types
  if (
    parameter.type === "point" ||
    parameter.type === "multipoint" ||
    parameter.type === "linestring" ||
    parameter.type === "multilinestring" ||
    parameter.type === "polygon" ||
    parameter.type === "multipolygon" ||
    parameter.type === "geometry" ||
    parameter.type === "geometrycollection" ||
    parameter.type === "feature" ||
    parameter.type === "featurecollection" ||
    parameter.type === "geojson"
  ) {
    return (
      <GeoJSONRenderer
        parameter={parameter}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  // Handle code-like content
  if (parameter.type === "json") {
    const formattedValue = formatValue(parameter.value, parameter.type);
    return (
      <CodeRenderer
        value={formattedValue}
        type={parameter.type}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  // Handle any type
  if (parameter.type === "any") {
    // Try to determine the best way to display the value
    if (parameter.value === null || parameter.value === undefined) {
      return <div className="text-xs text-neutral-500 italic">No value</div>;
    }

    // If it's an object use JSON formatting
    if (Array.isArray(parameter.value) || typeof parameter.value === "object") {
      const formattedValue = JSON.stringify(parameter.value, null, 2);
      return (
        <div className="space-y-1">
          <div className="text-xs text-neutral-500">
            Any type (contains json)
          </div>
          <CodeRenderer
            value={formattedValue}
            type="json"
            disabled={disabled}
            onChange={onChange}
          />
        </div>
      );
    }

    const actualType = typeof parameter.value;

    // For primitive values, use text renderer
    const formattedValue = formatValue(parameter.value, actualType);
    return (
      <div className="space-y-1">
        <div className="text-xs text-neutral-500">
          Any type (contains {actualType})
        </div>
        <TextRenderer
          value={formattedValue}
          type={actualType}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    );
  }

  // Handle simple text content
  const formattedValue = formatValue(parameter.value, parameter.type);
  return (
    <TextRenderer
      value={formattedValue}
      type={parameter.type}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
