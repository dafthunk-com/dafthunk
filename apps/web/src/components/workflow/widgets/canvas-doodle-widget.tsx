import { Eraser, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { isObjectReference, useObjectService } from "@/services/object-service";

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
  const [currentColor, setCurrentColor] = useState(strokeColor);
  const [isColorBarOpen, setIsColorBarOpen] = useState(false);
  const colorBarRef = useRef<HTMLDivElement>(null);
  const COLORS = [
    "#000000", // Black
    "#ef4444", // Red-500
    "#f59e42", // Orange-400
    "#facc15", // Yellow-400
    "#22c55e", // Green-500
    "#3b82f6", // Blue-500
    "#a21caf", // Purple-700
  ];

  // Initialize canvas and load existing drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size with 2x scaling for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 396; // Doubled from 172 for higher resolution
    const displayHeight = 396; // Doubled from 172 for higher resolution
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
    ctx.lineWidth = strokeWidth * 2 * (scaleFactor / 2); // Increased base stroke width
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Enhanced antialiasing settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Additional rendering optimizations
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

  // Update currentColor if config.strokeColor changes externally
  useEffect(() => {
    setCurrentColor(strokeColor);
  }, [strokeColor]);

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
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
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

    const displayWidth = 396;
    const displayHeight = 396;

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
        {/* Color Picker */}
        <div
          ref={colorBarRef}
          className="absolute bottom-2 left-2 z-10"
          onMouseEnter={() => setIsColorBarOpen(true)}
          onMouseLeave={() => setIsColorBarOpen(false)}
          tabIndex={0}
          aria-label="Color picker"
        >
          <div className="flex flex-row gap-1">
            {/* Selected color indicator (always visible) */}
            <div
              className="size-3 rounded-full border-4"
              style={{ borderColor: currentColor }}
            />

            {/* Available colors (visible on hover) */}
            {isColorBarOpen &&
              COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setCurrentColor(color);
                    setIsColorBarOpen(false);
                  }}
                  className="size-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
          </div>
        </div>
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="h-6 w-6 bg-white/90 hover:bg-white dark:bg-neutral-900 dark:hover:bg-neutral-800"
            disabled={isUploading}
            aria-label="Clear"
          >
            <Eraser className="h-3 w-3 text-neutral-600 dark:text-neutral-200" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={saveCanvas}
            className="h-6 w-6 bg-white/90 hover:bg-white dark:bg-neutral-900 dark:hover:bg-neutral-800"
            disabled={isUploading}
            aria-label="Save"
          >
            <Save className="h-3 w-3 text-neutral-600 dark:text-neutral-200" />
          </Button>
        </div>
        {/* Canvas or Image */}
        <div className="overflow-hidden bg-white">
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
