import { Eraser, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { isObjectReference, useObjectService } from "@/services/objectService";

interface CanvasDoodleConfig {
  value: any; // Now stores an object reference
  strokeColor: string;
  strokeWidth: number;
}

interface CanvasDoodleWidgetProps {
  config: CanvasDoodleConfig;
  onChange: (value: any) => void;
  compact?: boolean;
}

export function CanvasDoodleWidget({
  config,
  onChange,
  compact = false,
}: CanvasDoodleWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { strokeColor, strokeWidth } = config;
  const [imageReference, setImageReference] = useState<{
    id: string;
    mimeType: string;
  } | null>(
    config?.value && isObjectReference(config.value) ? config.value : null
  );
  const { createObjectUrl, uploadBinaryData } = useObjectService();
  const { isAuthenticated, organization } = useAuth();

  // Initialize canvas and load existing drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size with 2x scaling for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 344; // Doubled from 172 for higher resolution
    const displayHeight = 344; // Doubled from 172 for higher resolution
    const scaleFactor = Math.min(dpr, 2); // Cap at 2x for performance

    // Set the canvas dimensions for high resolution
    canvas.width = displayWidth * scaleFactor;
    canvas.height = displayHeight * scaleFactor;

    // Scale the context to counter the increased canvas dimensions
    ctx.scale(scaleFactor, scaleFactor);

    // Set the CSS size to maintain the same visual size
    canvas.style.width = `${displayWidth / 2}px`;
    canvas.style.height = `${displayHeight / 2}px`;

    // Fill with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Set initial styles with adjusted stroke width for DPR
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth * 2 * (scaleFactor / 2); // Increased base stroke width
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Enhanced antialiasing settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Additional rendering optimizations
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 1;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Load existing drawing if any
    if (imageReference) {
      // Load from object reference
      const img = new Image();
      img.onload = () => {
        // First fill with white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        // Then draw the image
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = createObjectUrl(imageReference);
    }
  }, [imageReference, strokeColor, strokeWidth, createObjectUrl]);

  // Get canvas coordinates
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 4);

    return {
      x: ((e.clientX - rect.left) * (canvas.width / rect.width)) / dpr,
      y: ((e.clientY - rect.top) * (canvas.height / rect.height)) / dpr,
    };
  };

  // Save canvas state
  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsUploading(true);

      // Check if the user is authenticated
      if (!isAuthenticated || !organization?.handle) {
        console.error("Authentication required or missing organization handle");
        setIsUploading(false);
        return;
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create image blob"));
          },
          "image/png",
          1.0
        );
      });

      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();

      // Upload to objects endpoint
      const reference = await uploadBinaryData(arrayBuffer, "image/png");

      // Update state and pass the reference to parent
      setImageReference(reference);

      // Pass the reference directly to the parent
      onChange(reference);

      setIsUploading(false);
    } catch (error) {
      console.error("Error saving canvas:", error);
      setIsUploading(false);
    }
  };

  // Handle drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);
  };

  // Clear canvas
  const handleClear = () => {
    // First, clear the image reference state
    setImageReference(null);

    // Then notify the parent component
    onChange(null);

    // Finally, reset the canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = 344;
    const displayHeight = 344;

    // Clear the canvas with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Reset drawing styles
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Canvas Doodle</Label>}
      <div className="relative w-full mx-auto">
        <div className="absolute top-2 right-2 z-10">
          {imageReference ? (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              className="h-6 w-6 bg-white/90 hover:bg-white"
              disabled={isUploading}
            >
              <Eraser className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={saveCanvas}
              className="h-6 w-6 bg-white/90 hover:bg-white"
              disabled={isUploading}
            >
              <Save className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          {imageReference ? (
            <div className="relative aspect-square">
              <img
                src={createObjectUrl(imageReference)}
                alt="Doodle"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="touch-none cursor-crosshair aspect-square"
            />
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">
              Uploading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
