import { createObjectUrl, isObjectReference } from "@/lib/utils/binaryUtils";
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

export function WorkflowOutputRenderer({
  output,
  compact = false,
}: WorkflowOutputRendererProps) {
  if (output.type === "image" && output.value) {
    try {
      // Check if we have an object reference
      if (isObjectReference(output.value)) {
        const objectUrl = createObjectUrl(output.value);
        return (
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
      } else {
        return (
          <div
            className={
              compact
                ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
                : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
            }
          >
            Invalid image reference format
          </div>
        );
      }
    } catch (error) {
      console.error("Error processing image data:", error);
      return (
        <div
          className={
            compact
              ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
              : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
          }
        >
          Error processing image data
        </div>
      );
    }
  }

  if (output.type === "audio" && output.value) {
    const [audioError, setAudioError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      try {
        // Check if we have an object reference
        if (isObjectReference(output.value)) {
          const objectUrl = createObjectUrl(output.value);
          setAudioUrl(objectUrl);
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
    }, [output.value]);

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

    // If we already have an error, show it
    if (audioError && !audioUrl) {
      return (
        <div
          className={
            compact
              ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
              : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
          }
        >
          {audioError}
        </div>
      );
    }

    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
        {audioUrl && (
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="w-full rounded-md"
            onError={handleAudioError}
          />
        )}
        {audioError && (
          <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md mt-1">
            {audioError}
          </div>
        )}
      </div>
    );
  }

  if (output.type === "document" && output.value) {
    try {
      if (isObjectReference(output.value)) {
        const objectUrl = createObjectUrl(output.value);
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
        } else if (isImage) {
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
        } else {
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
        }
      } else {
        return (
          <div
            className={
              compact
                ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
                : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
            }
          >
            Invalid document reference format
          </div>
        );
      }
    } catch (error) {
      console.error("Error processing document data:", error);
      return (
        <div
          className={
            compact
              ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
              : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
          }
        >
          Error processing document data
        </div>
      );
    }
  }

  if (output.type === "binary" && output.value) {
    if (isObjectReference(output.value)) {
      return (
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
            href={createObjectUrl(output.value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            Download
          </a>
        </div>
      );
    } else {
      return (
        <div
          className={
            compact
              ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
              : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
          }
        >
          Invalid binary reference format
        </div>
      );
    }
  }

  const formattedValue = formatOutputValue(output.value, output.type);
  if (!formattedValue) return null;

  return (
    <div
      className={
        compact
          ? "text-xs p-1 mt-1 bg-gray-50 rounded border border-gray-200"
          : "w-full p-2 bg-muted rounded-md border border-border"
      }
    >
      {formattedValue}
    </div>
  );
}
