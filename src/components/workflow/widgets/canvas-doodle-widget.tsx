import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface CanvasDoodleConfig {
  value: string;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
}

interface CanvasDoodleWidgetProps {
  config: CanvasDoodleConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function CanvasDoodleWidget({
  config,
  onChange,
  compact = false,
}: CanvasDoodleWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { strokeColor, strokeWidth } = config;

  // Initialize canvas and load existing drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size with 2x scaling for sharp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Use at most 2x scaling
    const displayWidth = 172; // Reduced to account for borders and padding
    const displayHeight = 172; // Reduced to account for borders and padding
    const scaleFactor = dpr;

    // Set the canvas dimensions for high resolution
    canvas.width = displayWidth * scaleFactor;
    canvas.height = displayHeight * scaleFactor;

    // Scale the context to counter the increased canvas dimensions
    ctx.scale(scaleFactor, scaleFactor);

    // Set the CSS size
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Set initial styles with adjusted stroke width for DPR
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * (dpr / 4); // Adjust stroke width for DPR
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Load existing drawing if any
    if (config.value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = config.value;
    }
  }, [config.value, strokeColor, strokeWidth]);

  // Get canvas coordinates
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 4);
    
    return {
      x: ((e.clientX - rect.left) * (canvas.width / rect.width)) / dpr,
      y: ((e.clientY - rect.top) * (canvas.height / rect.height)) / dpr
    };
  };

  // Save canvas state
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    onChange(dataUrl);
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
    saveCanvas();
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = 172;
    const displayHeight = 172;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    saveCanvas();
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Canvas Doodle</Label>}
      <div className="relative w-full mx-auto">
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            className="h-6 w-6 bg-white/90 hover:bg-white"
          >
            <Eraser className="h-3 w-3" />
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="touch-none cursor-crosshair"
          />
        </div>
      </div>
    </div>
  );
}