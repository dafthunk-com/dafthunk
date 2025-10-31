import Camera from "lucide-react/icons/camera";
import X from "lucide-react/icons/x";
import { useEffect, useRef, useState } from "react";

import { useObjectService } from "@/services/object-service";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface WebcamWidgetProps extends BaseWidgetProps {
  value: any;
  width: number;
  height: number;
}

function WebcamWidget({
  value,
  onChange,
  readonly = false,
}: WebcamWidgetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageReference, setImageReference] = useState<{
    id: string;
    mimeType: string;
  } | null>(value && typeof value === "object" && value.id ? value : null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  useEffect(() => {
    if (!imageReference && !readonly) {
      startWebcam();
    }
    return () => stopWebcam();
  }, [imageReference, readonly]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access webcam");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || readonly) return;

    try {
      setIsUploading(true);
      setError(null);

      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/jpeg",
          1.0
        );
      });

      const arrayBuffer = await blob.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, "image/png");

      setImageReference(reference);
      onChange(reference);
      stopWebcam();
      setIsUploading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture image");
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    if (readonly) return;
    setImageReference(null);
    onChange(null);
  };

  return (
    <div>
      <div className="relative w-full">
        <div className="absolute top-2 right-2 z-10">
          {imageReference ? (
            <button
              onClick={clearImage}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-600"
              aria-label="Clear image"
              disabled={readonly}
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={captureImage}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-600"
              aria-label="Capture image"
              disabled={isUploading || readonly}
            >
              <Camera className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="overflow-hidden bg-white">
          <div className="relative aspect-video bg-neutral-100">
            {imageReference ? (
              <img
                src={createObjectUrl(imageReference)}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                Uploading...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const webcamWidget = createWidget({
  component: WebcamWidget,
  nodeTypes: ["webcam"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
    width: getInputValue(inputs, "width", 640),
    height: getInputValue(inputs, "height", 480),
  }),
});
