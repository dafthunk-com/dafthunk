import { isObjectReference, useObjectService } from "@/services/objectService";
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
    if (type === "audio" || type === "image" || type === "document") {
      return ""; // Don't display data as text for types handled by dedicated renderers
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
        ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800"
        : "text-sm text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800"
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
          className={`w-full rounded-md border ${compact ? "h-32" : "h-64"}`}
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
          alt={`${output.name} document`}
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
        View Document ({output.value.mimeType.split("/")[1]})
      </a>
    </div>
  );
};

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
        ? "text-xs p-1 mt-1 bg-secondary/50 rounded border"
        : "w-full p-2 bg-secondary/50 rounded-md border border-border"
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const { createObjectUrl } = useObjectService();

  useEffect(() => {
    // Reset states when output changes
    setAudioUrl(null);
    setAudioError(null);
    setImageUrl(null);
    setImageError(null);
    setDocumentUrl(null);
    setDocumentError(null);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (output.value) {
      if (output.type === "audio") {
        try {
          if (isObjectReference(output.value)) {
            const url = createObjectUrl(output.value);
            setAudioUrl(url);
            objectUrlRef.current = url;
          } else {
            throw new Error("Invalid audio reference format");
          }
        } catch (error) {
          console.error("Error processing audio data:", error);
          setAudioError(
            error instanceof Error
              ? error.message
              : "Unknown error loading audio"
          );
        }
      } else if (output.type === "image") {
        try {
          if (isObjectReference(output.value)) {
            const url = createObjectUrl(output.value);
            setImageUrl(url);
            objectUrlRef.current = url;
          } else {
            throw new Error("Invalid image reference format");
          }
        } catch (error) {
          console.error("Error processing image data:", error);
          setImageError(
            error instanceof Error
              ? error.message
              : "Unknown error loading image"
          );
        }
      } else if (output.type === "document") {
        try {
          if (isObjectReference(output.value)) {
            const url = createObjectUrl(output.value);
            setDocumentUrl(url);
            objectUrlRef.current = url;
          } else {
            throw new Error("Invalid document reference format");
          }
        } catch (error) {
          console.error("Error processing document data:", error);
          setDocumentError(
            error instanceof Error
              ? error.message
              : "Unknown error loading document"
          );
        }
      }
    }

    // Cleanup function
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [output.type, output.value, createObjectUrl]);

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
    if (imageError) {
      return <ErrorMessage message={imageError} compact={compact} />;
    }
    if (imageUrl) {
      return (
        <ImageRenderer output={output} compact={compact} objectUrl={imageUrl} />
      );
    }
    // If output.value is present, useEffect should have set either imageUrl or imageError.
    // Returning null if neither is ready, assuming useEffect will update.
    return null;
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
    if (documentError) {
      return <ErrorMessage message={documentError} compact={compact} />;
    }
    if (documentUrl) {
      return (
        <DocumentRenderer
          output={output}
          objectUrl={documentUrl}
          compact={compact}
        />
      );
    }
    // If output.value is present, useEffect should have set either documentUrl or documentError.
    // Returning null if neither is ready, assuming useEffect will update.
    return null;
  }

  // Handle text-based output
  const formattedValue = formatOutputValue(output.value, output.type);
  if (!formattedValue) return null;

  return <TextRenderer value={formattedValue} compact={compact} />;
}
