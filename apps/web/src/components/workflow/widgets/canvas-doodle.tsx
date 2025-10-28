import Eraser from "lucide-react/icons/eraser";
import Save from "lucide-react/icons/save";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { isObjectReference, useObjectService } from "@/services/object-service";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface CanvasDoodleWidgetProps extends BaseWidgetProps {
  value: any;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
}

const COLORS = [
  "#000000",
  "#ef4444",
  "#f59e42",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#a21caf",
];

function CanvasDoodleWidget({
  value,
  strokeColor,
  strokeWidth,
  onChange,
  readonly = false,
}: CanvasDoodleWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageReference, setImageReference] = useState<{
    id: string;
    mimeType: string;
  } | null>(value && isObjectReference(value) ? value : null);
  const { createObjectUrl, uploadBinaryData } = useObjectService();
  const { isAuthenticated, organization } = useAuth();
  const [currentColor, setCurrentColor] = useState(strokeColor);
  const [isColorBarOpen, setIsColorBarOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = 396;
    const displayHeight = 396;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${displayWidth / 2}px`;
    canvas.style.height = `${displayHeight / 2}px`;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    ctx.lineWidth = strokeWidth * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (imageReference) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = createObjectUrl(imageReference);
    }
  }, [imageReference, strokeColor, strokeWidth, createObjectUrl]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    return {
      x: ((e.clientX - rect.left) * (canvas.width / rect.width)) / dpr,
      y: ((e.clientY - rect.top) * (canvas.height / rect.height)) / dpr,
    };
  };

  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || readonly || !isAuthenticated || !organization?.handle)
      return;

    try {
      setIsUploading(true);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/png",
          1.0
        );
      });

      const arrayBuffer = await blob.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, "image/png");

      setImageReference(reference);
      onChange(reference);
      setIsUploading(false);
    } catch (error) {
      console.error("Error saving canvas:", error);
      setIsUploading(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readonly) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = currentColor;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readonly) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.strokeStyle = currentColor;
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (readonly) return;

    setImageReference(null);
    onChange(null);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 396, 396);
    ctx.strokeStyle = strokeColor;
  };

  return (
    <div className="p-2">
      <div className="relative w-full">
        <div
          className="absolute bottom-2 left-2 z-10"
          onMouseEnter={() => !readonly && setIsColorBarOpen(true)}
          onMouseLeave={() => setIsColorBarOpen(false)}
        >
          <div className="flex flex-row gap-1">
            <div
              className="size-3 rounded-full border-4"
              style={{ borderColor: currentColor }}
            />
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
                  disabled={readonly}
                />
              ))}
          </div>
        </div>
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="h-6 w-6 bg-white/90 hover:bg-white"
            disabled={isUploading || readonly}
            aria-label="Clear"
          >
            <Eraser className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={saveCanvas}
            className="h-6 w-6 bg-white/90 hover:bg-white"
            disabled={isUploading || readonly}
            aria-label="Save"
          >
            <Save className="h-3 w-3" />
          </Button>
        </div>
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">
              Uploading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const canvasDoodleWidget = createWidget({
  component: CanvasDoodleWidget,
  nodeTypes: ["canvas-doodle"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
    width: getInputValue(inputs, "width", 400),
    height: getInputValue(inputs, "height", 300),
    strokeColor: getInputValue(inputs, "strokeColor", "#000000"),
    strokeWidth: getInputValue(inputs, "strokeWidth", 2),
  }),
});
