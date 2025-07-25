import { ObjectReference } from "@dafthunk/types";
import { useEffect, useRef, useState } from "react";

import { CodeBlock } from "@/components/docs/code-block";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isObjectReference } from "@/services/object-service";

import { WorkflowParameter } from "./workflow-types";

interface WorkflowValueRendererProps {
  parameter: WorkflowParameter;
  createObjectUrl?: (objectReference: ObjectReference) => string;
  compact?: boolean;
  readonly?: boolean;
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
  compact,
  objectUrl,
  readonly,
}: {
  parameter: WorkflowParameter;
  compact?: boolean;
  objectUrl: string;
  readonly?: boolean;
}) => (
  <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
    <img
      src={objectUrl}
      alt={`${parameter.name} ${readonly ? "output" : "input"}`}
      className="w-full rounded-md border"
      onError={(e) => {
        console.error("Error loading image:", e);
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling?.classList.remove("hidden");
      }}
    />
    <div className="hidden text-sm text-red-500 p-2 bg-red-50 rounded-md mt-1 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
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
  compact,
}: {
  parameter: WorkflowParameter;
  objectUrl: string;
  compact?: boolean;
}) => {
  const isPDF = parameter.value.mimeType === "application/pdf";
  const isImage = parameter.value.mimeType.startsWith("image/");

  if (isPDF) {
    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
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
          className={`w-full rounded-md border nowheel ${compact ? "h-32" : "h-64"}`}
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
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
    <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
      <a
        href={objectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-500 hover:underline flex items-center"
      >
        View Document ({parameter.value.mimeType.split("/")[1]})
      </a>
    </div>
  );
};

// Geometry renderer for GeoJSON geometries
const GeoJSONRenderer = ({
  parameter,
  compact,
  readonly,
  onChange,
}: {
  parameter: WorkflowParameter;
  compact?: boolean;
  readonly?: boolean;
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

  const formattedValue = formatGeoJSON(parameter.value);
  const geometryLabel = getGeometryTypeLabel(parameter.type);

  if (readonly) {
    return (
      <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
        <div
          className={`${compact ? "max-h-[300px] overflow-y-auto nowheel" : ""}`}
        >
          <CodeBlock
            language="json"
            className="text-xs my-0 border [&_pre]:p-2"
          >
            {formattedValue}
          </CodeBlock>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
      <div className="text-xs text-neutral-500">
        {geometryLabel} (GeoJSON)
      </div>
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
  compact,
  readonly,
  onChange,
}: {
  value: string;
  type: string;
  compact?: boolean;
  readonly?: boolean;
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

  if (readonly) {
    return (
      <div
        className={`${compact ? "mt-1 max-h-[300px] overflow-y-auto nowheel" : "mt-2"}`}
      >
        <CodeBlock
          language={getLanguage(type)}
          className="text-xs my-0 border [&_pre]:p-2"
        >
          {value}
        </CodeBlock>
      </div>
    );
  }

  return (
    <div className={compact ? "mt-1" : "mt-2"}>
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="text-xs font-mono min-h-[100px]"
        placeholder={`Enter ${type} value`}
      />
    </div>
  );
};

// Text renderer for simple text content
const TextRenderer = ({
  value,
  type,
  compact,
  readonly,
  onChange,
}: {
  value: string;
  type: string;
  compact?: boolean;
  readonly?: boolean;
  onChange?: (value: any) => void;
}) => {
  if (readonly) {
    return (
      <div
        className={
          compact
            ? "text-xs p-1 mt-1 bg-secondary/50 rounded border whitespace-pre-line max-h-[300px] overflow-y-auto nowheel"
            : "w-full p-2 bg-secondary/50 rounded-md border border-border whitespace-pre-line"
        }
      >
        {value}
      </div>
    );
  }

  if (type === "string") {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`text-sm min-h-[80px] resize-y ${
          readonly ? "opacity-70 cursor-not-allowed" : ""
        }`}
        disabled={readonly}
        placeholder={`Enter ${type} value`}
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`text-sm h-8 ${
        readonly ? "opacity-70 cursor-not-allowed" : ""
      }`}
      disabled={readonly}
      placeholder={`Enter ${type} value`}
    />
  );
};

export function WorkflowValueRenderer({
  parameter,
  createObjectUrl,
  compact = false,
  readonly = false,
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

  if (!parameter.value && !onChange) {
    return (
      <div
        className={
          compact
            ? "text-xs p-1 mt-1 bg-secondary/50 rounded border"
            : "w-full p-2 bg-secondary/50 rounded-md border border-border"
        }
      >
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
            compact={compact}
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
            compact={compact}
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
            compact={compact}
            readonly={readonly}
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
                compact={compact}
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
          if (
            parameter.value.mimeType === "application/pdf" ||
            parameter.value.mimeType.startsWith("application/") ||
            parameter.value.mimeType.startsWith("text/")
          ) {
            return (
              <DocumentRenderer
                parameter={parameter}
                objectUrl={objectUrl}
                compact={compact}
              />
            );
          }
        }
        // Fallback for any type with object reference
        return (
          <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
            <div className="text-xs text-neutral-500">
              File ({parameter.value.mimeType || "unknown type"})
            </div>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
            >
              View File
            </a>
          </div>
        );
      default:
        return (
          <div className="text-sm text-orange-500">
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
        compact={compact}
        readonly={readonly}
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
        compact={compact}
        readonly={readonly}
        onChange={onChange}
      />
    );
  }

  // Handle any type
  if (parameter.type === "any") {
    // Try to determine the best way to display the value
    if (parameter.value === null || parameter.value === undefined) {
      return <div className="text-sm text-neutral-500 italic">No value</div>;
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
            compact={compact}
            readonly={readonly}
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
          compact={compact}
          readonly={readonly}
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
      compact={compact}
      readonly={readonly}
      onChange={onChange}
    />
  );
}
