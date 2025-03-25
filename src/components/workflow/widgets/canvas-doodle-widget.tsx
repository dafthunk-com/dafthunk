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

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Set initial styles with adjusted stroke width for DPR
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth * (dpr / 4); // Adjust stroke width for DPR
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Load existing drawing if any
    if (config.value) {
      try {
        const parsedConfig = JSON.parse(config.value);
        if (parsedConfig.value) {
          const img = new Image();
          img.onload = () => {
            // First fill with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, displayWidth, displayHeight);
            // Then draw the image
            ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          };
          img.src = `data:image/png;base64,${parsedConfig.value}`;
        }
      } catch (error) {
        console.error('Error loading existing drawing:', error);
      }
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
    
    // Ensure white background before saving
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Get base64 data and remove the data URL prefix
    const fullDataUrl = canvas.toDataURL("image/png", 1.0);
    const base64Data = fullDataUrl.replace(/^data:image\/\w+;base64,/, "");
    
    // Create node inputs object with explicit type conversion
    const nodeInputs = {
      value: base64Data,
      width: Number(canvas.width),
      height: Number(canvas.height),
      strokeColor: String(config.strokeColor || "#000000"),
      strokeWidth: Number(config.strokeWidth || 2)
    };

    try {
      // Convert to JSON string
      const jsonString = JSON.stringify(nodeInputs);
      console.log('Canvas data:', {
        inputObject: nodeInputs,
        jsonString,
        width: canvas.width,
        height: canvas.height
      });
      onChange(jsonString);
    } catch (error) {
      console.error('Error stringifying canvas data:', error);
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