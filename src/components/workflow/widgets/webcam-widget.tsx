import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Camera, X } from "lucide-react";
import { uploadBinaryData, createObjectUrl } from "@/lib/utils/binaryUtils";

interface WebcamConfig {
  value: any; // Stores an object reference with id and mimeType or null
}

interface WebcamWidgetProps {
  config: WebcamConfig;
  onChange: (value: any) => void;
  compact?: boolean;
}

export function WebcamWidget({
  config,
  onChange,
  compact = false,
}: WebcamWidgetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageReference, setImageReference] = useState<{
    id: string;
    mimeType: string;
  } | null>(
    config?.value && typeof config.value === "object" && config.value.id
      ? config.value
      : null
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    if (!imageReference) {
      startWebcam();
    }
    return () => stopWebcam();
  }, [imageReference]);

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
    if (!videoRef.current) return;

    try {
      setIsUploading(true);
      setError(null);

      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create image blob"));
          },
          "image/jpeg",
          1.0
        );
      });

      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();

      // Upload to objects endpoint
      const reference = await uploadBinaryData(arrayBuffer, "image/png");

      if (
        !reference ||
        typeof reference.id !== "string" ||
        typeof reference.mimeType !== "string"
      ) {
        throw new Error("Invalid reference from uploadBinaryData");
      }

      // Update state and pass the reference to parent
      setImageReference(reference);
      onChange(reference);

      // Stop the webcam after successful capture
      stopWebcam();
      setIsUploading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture image");
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setImageReference(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Webcam Capture</Label>}
      <div className="relative w-full mx-auto">
        <div className="absolute top-2 right-2 z-10">
          {imageReference ? (
            <button
              onClick={clearImage}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Clear image"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={captureImage}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Capture image"
              disabled={isUploading}
            >
              <Camera className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="relative aspect-video bg-gray-100">
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
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                <span>Uploading...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
