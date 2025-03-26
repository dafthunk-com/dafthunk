import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Camera, X } from "lucide-react";

interface WebcamConfig {
  value: string;
  width: number;
  height: number;
}

interface WebcamWidgetProps {
  config: WebcamConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function WebcamWidget({
  config,
  onChange,
  compact = false,
}: WebcamWidgetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!capturedImage) {
      startWebcam();
    }
    return () => stopWebcam();
  }, [capturedImage]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: config.width },
          height: { ideal: config.height },
        },
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

  const captureImage = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, config.width, config.height);
    const base64Data = canvas.toDataURL("image/png").split(",")[1];
    setCapturedImage(base64Data);

    // Create properly structured image output
    const imageOutput = {
      value: base64Data,
      width: config.width,
      height: config.height,
    };

    onChange(JSON.stringify(imageOutput));
  };

  const clearImage = () => {
    setCapturedImage(null);
    onChange(
      JSON.stringify({
        value: "",
        width: config.width,
        height: config.height,
      })
    );
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Webcam Capture</Label>}
      <div className="relative w-full mx-auto">
        <div className="absolute top-2 right-2 z-10">
          {capturedImage ? (
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
            >
              <Camera className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="relative aspect-video bg-gray-100">
            {capturedImage ? (
              <img
                src={`data:image/png;base64,${capturedImage}`}
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
          </div>
        </div>
      </div>
    </div>
  );
}
