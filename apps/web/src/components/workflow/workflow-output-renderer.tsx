import {
  createObjectUrl,
  isObjectReference,
} from "@/services/workflowObjectService";
import { WorkflowParameter } from "./workflow-types";
import { useEffect, useRef, useState } from "react";

interface WorkflowOutputRendererProps {
  output: WorkflowParameter;
  compact?: boolean;
}

// Format output value for display
export const formatOutputValue = (value: any, type: string): string => {
  if (value === undefined || value === null) return "";

  try {
    if (
      type === "binary" ||
      type === "audio" ||
      type === "image" ||
      type === "document"
    ) {
      return ""; // Don't display binary data as text
    } else if (type === "json" || type === "array") {
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
    console.warn("Error formatting output value:", e);
    return String(value);
  }
};

// Reusable error component
const ErrorMessage = ({
  message,
  compact,
}: {
  message: string;
  compact?: boolean;
}) => (
  <div
    className={
      compact
        ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
        : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
    }
  >
    {message}
  </div>
);

// Image output renderer
const ImageRenderer = ({
  output,
  compact,
  objectUrl,
}: {
  output: WorkflowParameter;
  compact?: boolean;
  objectUrl: string;
}) => (
  <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
    <img
      src={objectUrl}
      alt={`${output.name} output`}
      className="w-full rounded-md border border-gray-200"
      onError={(e) => {
        console.error("Error loading image:", e);
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling?.classList.remove("hidden");
      }}
    />
    <div className="hidden text-sm text-red-500 p-2 bg-red-50 rounded-md mt-1">
      Error displaying image. The data may be corrupted.
    </div>
  </div>
);

// Audio output renderer
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

// Document output renderer
const DocumentRenderer = ({
  output,
  objectUrl,
  compact,
}: {
  output: WorkflowParameter;
  objectUrl: string;
  compact?: boolean;
}) => {
  const isPDF = output.value.mimeType === "application/pdf";
  const isImage = output.value.mimeType.startsWith("image/");

  if (isPDF) {
    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">PDF Document</span>
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
          className={`w-full rounded-md border border-gray-200 ${compact ? "h-32" : "h-64"}`}
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Document (Image)</span>
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
          alt={`${output.name} document`}
          className="w-full rounded-md border border-gray-200"
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
        View Document ({output.value.mimeType.split("/")[1]})
      </a>
    </div>
  );
};

// Binary output renderer
const BinaryRenderer = ({
  output,
  objectUrl,
  compact,
}: {
  output: WorkflowParameter;
  objectUrl: string;
  compact?: boolean;
}) => (
  <div
    className={
      compact
        ? "text-xs text-gray-500 p-1 mt-1 flex justify-between items-center"
        : "relative w-full p-2 flex items-center justify-between rounded-lg border border-border bg-muted"
    }
  >
    <p className={compact ? "" : "text-sm text-muted-foreground"}>
      Binary data ({output.value.mimeType})
    </p>
    <a
      href={objectUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-500 hover:underline"
    >
      Download
    </a>
  </div>
);

// Text output renderer
const TextRenderer = ({
  value,
  compact,
}: {
  value: string;
  compact?: boolean;
}) => (
  <div
    className={
      compact
        ? "text-xs p-1 mt-1 bg-gray-50 rounded border border-gray-200"
        : "w-full p-2 bg-muted rounded-md border border-border"
    }
  >
    {value}
  </div>
);

export function WorkflowOutputRenderer({
  output,
  compact = false,
}: WorkflowOutputRendererProps) {
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (output.type === "audio" && output.value) {
      try {
        if (isObjectReference(output.value)) {
          setAudioUrl(createObjectUrl(output.value));
          setAudioError(null);
        } else {
          throw new Error("Invalid audio reference format");
        }
      } catch (error) {
        console.error("Error processing audio data:", error);
        setAudioError(
          error instanceof Error
            ? error.message
            : "Failed to process audio data"
        );
        setAudioUrl(null);
      }
    }
  }, [output.value, output.type]);

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    console.error("Audio playback error:", e);
    if (audioRef.current) {
      console.log("Audio element error:", audioRef.current.error);
      const errorMessage =
        audioRef.current.error?.message || "Unknown audio playback error";
      setAudioError(`Error playing audio: ${errorMessage}`);
    }
  };

  // Handle image output
  if (output.type === "image" && output.value) {
    try {
      if (isObjectReference(output.value)) {
        return (
          <ImageRenderer
            output={output}
            compact={compact}
            objectUrl={createObjectUrl(output.value)}
          />
        );
      }
      return (
        <ErrorMessage
          message="Invalid image reference format"
          compact={compact}
        />
      );
    } catch (error) {
      console.error("Error processing image data:", error);
      return (
        <ErrorMessage message="Error processing image data" compact={compact} />
      );
    }
  }

  // Handle audio output
  if (output.type === "audio" && output.value) {
    if (audioError && !audioUrl) {
      return <ErrorMessage message={audioError} compact={compact} />;
    }

    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
        {audioUrl && (
          <AudioRenderer
            audioUrl={audioUrl}
            onError={handleAudioError}
            audioRef={audioRef}
          />
        )}
      </div>
    );
  }

  // Handle document output
  if (output.type === "document" && output.value) {
    try {
      if (isObjectReference(output.value)) {
        return (
          <DocumentRenderer
            output={output}
            objectUrl={createObjectUrl(output.value)}
            compact={compact}
          />
        );
      }
      return (
        <ErrorMessage
          message="Invalid document reference format"
          compact={compact}
        />
      );
    } catch (error) {
      console.error("Error processing document data:", error);
      return (
        <ErrorMessage
          message="Error processing document data"
          compact={compact}
        />
      );
    }
  }

  // Handle binary output
  if (output.type === "binary" && output.value) {
    if (isObjectReference(output.value)) {
      return (
        <BinaryRenderer
          output={output}
          objectUrl={createObjectUrl(output.value)}
          compact={compact}
        />
      );
    }
    return (
      <ErrorMessage
        message="Invalid binary reference format"
        compact={compact}
      />
    );
  }

  // Handle text-based output
  const formattedValue = formatOutputValue(output.value, output.type);
  if (!formattedValue) return null;

  return <TextRenderer value={formattedValue} compact={compact} />;
}
