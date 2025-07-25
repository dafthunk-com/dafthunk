import { useEffect, useRef, useState } from "react";

interface GeoJSONCanvasRendererProps {
  geojson: any;
  width?: number;
  height?: number;
  compact?: boolean;
  className?: string;
}

interface CanvasStyle {
  strokeColor: string;
  fillColor: string;
  pointRadius: number;
  lineWidth: number;
}

interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function GeoJSONCanvasRenderer({
  geojson,
  width = 400,
  height = 300,
  compact = false,
  className = "",
}: GeoJSONCanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Responsive sizing for compact mode
  const canvasWidth = compact ? Math.min(width, 300) : width;
  const canvasHeight = compact ? Math.min(height, 200) : height;

  const defaultStyle: CanvasStyle = {
    strokeColor: "#3b82f6", // blue-500
    fillColor: "rgba(59, 130, 246, 0.2)", // blue-500 with opacity
    pointRadius: 4,
    lineWidth: 2,
  };

  const pointStyle: CanvasStyle = {
    strokeColor: "#1e40af", // blue-800 - darker stroke for better visibility
    fillColor: "#3b82f6", // blue-500 - solid fill for points
    pointRadius: 5, // slightly larger for better visibility
    lineWidth: 2,
  };

  // Extract coordinates from any geometry
  const extractCoordinates = (geometry: any): number[][] => {
    const coords: number[][] = [];
    
    const addCoordinate = (coord: number[]) => {
      if (coord.length >= 2) {
        coords.push([coord[0], coord[1]]);
      }
    };

    const processCoordinates = (coordinates: any, depth: number) => {
      if (depth === 0) {
        addCoordinate(coordinates);
      } else if (Array.isArray(coordinates)) {
        coordinates.forEach((coord) => processCoordinates(coord, depth - 1));
      }
    };

    switch (geometry.type) {
      case "Point":
        processCoordinates(geometry.coordinates, 0);
        break;
      case "MultiPoint":
      case "LineString":
        processCoordinates(geometry.coordinates, 1);
        break;
      case "MultiLineString":
      case "Polygon":
        processCoordinates(geometry.coordinates, 2);
        break;
      case "MultiPolygon":
        processCoordinates(geometry.coordinates, 3);
        break;
      case "GeometryCollection":
        geometry.geometries?.forEach((geom: any) => {
          coords.push(...extractCoordinates(geom));
        });
        break;
    }

    return coords;
  };

  // Calculate bounding box for all coordinates
  const calculateBoundingBox = (allCoords: number[][]): BoundingBox => {
    if (allCoords.length === 0) {
      return { minX: -180, maxX: 180, minY: -90, maxY: 90 };
    }

    let minX = allCoords[0][0];
    let maxX = allCoords[0][0];
    let minY = allCoords[0][1];
    let maxY = allCoords[0][1];

    allCoords.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    // Calculate dimensions
    let bboxWidth = maxX - minX;
    let bboxHeight = maxY - minY;

    // Handle the case of a single point or points that are all the same
    // by providing a minimum bounding box size
    const minDimension = 0.1; // Minimum size for single points
    if (bboxWidth === 0) {
      bboxWidth = minDimension;
      // Center the point horizontally
      minX = minX - bboxWidth / 2;
      maxX = minX + bboxWidth;
    }
    if (bboxHeight === 0) {
      bboxHeight = minDimension;
      // Center the point vertically  
      minY = minY - bboxHeight / 2;
      maxY = minY + bboxHeight;
    }

    // Add some padding (10% of the dimensions)
    const paddingX = bboxWidth * 0.1;
    const paddingY = bboxHeight * 0.1;

    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    };
  };

  // Transform geographic coordinates to canvas coordinates while maintaining aspect ratio
  const transformCoordinate = (
    coord: number[],
    bbox: BoundingBox,
    canvasWidth: number,
    canvasHeight: number
  ): [number, number] => {
    // Calculate the dimensions of the bounding box
    const bboxWidth = bbox.maxX - bbox.minX;
    const bboxHeight = bbox.maxY - bbox.minY;
    
    // Calculate scales for both axes
    const scaleX = canvasWidth / bboxWidth;
    const scaleY = canvasHeight / bboxHeight;
    
    // Use the smaller scale to maintain proportions
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate the scaled dimensions
    const scaledWidth = bboxWidth * scale;
    const scaledHeight = bboxHeight * scale;
    
    // Calculate centering offsets
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;
    
    // Transform coordinates with proper scaling and centering
    const x = ((coord[0] - bbox.minX) * scale) + offsetX;
    // Flip Y coordinate (canvas Y grows downward, but geographic Y grows upward)
    const y = canvasHeight - (((coord[1] - bbox.minY) * scale) + offsetY);
    
    return [x, y];
  };

  // Helper function to draw vertex points
  const drawVertex = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const originalStroke = ctx.strokeStyle;
    const originalFill = ctx.fillStyle;
    const originalLineWidth = ctx.lineWidth;
    
    // Make vertices more visible with higher contrast colors
    ctx.strokeStyle = "#1f2937"; // gray-800 - much darker
    ctx.fillStyle = "#fbbf24"; // amber-400 - bright yellow for visibility
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI); // Larger radius for better visibility
    ctx.fill();
    ctx.stroke();
    
    // Restore original styles
    ctx.strokeStyle = originalStroke;
    ctx.fillStyle = originalFill;
    ctx.lineWidth = originalLineWidth;
  };

  // Draw different geometry types
  const drawGeometry = (
    ctx: CanvasRenderingContext2D,
    geometry: any,
    bbox: BoundingBox,
    style: CanvasStyle
  ) => {
    ctx.strokeStyle = style.strokeColor;
    ctx.fillStyle = style.fillColor;
    ctx.lineWidth = style.lineWidth;

    switch (geometry.type) {
      case "Point":
        // Use special point styling for better visibility
        ctx.strokeStyle = pointStyle.strokeColor;
        ctx.fillStyle = pointStyle.fillColor;
        ctx.lineWidth = pointStyle.lineWidth;
        
        const [px, py] = transformCoordinate(geometry.coordinates, bbox, canvasWidth, canvasHeight);
        
        ctx.beginPath();
        ctx.arc(px, py, pointStyle.pointRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Also draw vertex dot at the center
        drawVertex(ctx, px, py);
        
        // Reset styles for other geometries
        ctx.strokeStyle = style.strokeColor;
        ctx.fillStyle = style.fillColor;
        ctx.lineWidth = style.lineWidth;
        break;

      case "MultiPoint":
        // Use special point styling for better visibility
        ctx.strokeStyle = pointStyle.strokeColor;
        ctx.fillStyle = pointStyle.fillColor;
        ctx.lineWidth = pointStyle.lineWidth;
        
        geometry.coordinates.forEach((coord: number[]) => {
          const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
          ctx.beginPath();
          ctx.arc(x, y, pointStyle.pointRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Also draw vertex dot at the center
          drawVertex(ctx, x, y);
        });
        
        // Reset styles for other geometries
        ctx.strokeStyle = style.strokeColor;
        ctx.fillStyle = style.fillColor;
        ctx.lineWidth = style.lineWidth;
        break;

      case "LineString":
        ctx.beginPath();
        geometry.coordinates.forEach((coord: number[], index: number) => {
          const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // Draw vertices as small points
        geometry.coordinates.forEach((coord: number[]) => {
          const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
          drawVertex(ctx, x, y);
        });
        break;

      case "MultiLineString":
        geometry.coordinates.forEach((line: number[][]) => {
          ctx.beginPath();
          line.forEach((coord: number[], index: number) => {
            const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
          
          // Draw vertices as small points
          line.forEach((coord: number[]) => {
            const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
            drawVertex(ctx, x, y);
          });
        });
        break;

      case "Polygon":
        geometry.coordinates.forEach((ring: number[][], ringIndex: number) => {
          ctx.beginPath();
          ring.forEach((coord: number[], index: number) => {
            const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          if (ringIndex === 0) {
            ctx.fill();
          }
          ctx.stroke();
          
          // Draw vertices as small points (excluding the last coordinate which is the same as the first)
          ring.slice(0, -1).forEach((coord: number[]) => {
            const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
            drawVertex(ctx, x, y);
          });
        });
        break;

      case "MultiPolygon":
        geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon.forEach((ring: number[][], ringIndex: number) => {
            ctx.beginPath();
            ring.forEach((coord: number[], index: number) => {
              const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
              if (index === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            ctx.closePath();
            if (ringIndex === 0) {
              ctx.fill();
            }
            ctx.stroke();
            
            // Draw vertices as small points (excluding the last coordinate which is the same as the first)
            ring.slice(0, -1).forEach((coord: number[]) => {
              const [x, y] = transformCoordinate(coord, bbox, canvasWidth, canvasHeight);
              drawVertex(ctx, x, y);
            });
          });
        });
        break;

      case "GeometryCollection":
        geometry.geometries?.forEach((geom: any) => {
          drawGeometry(ctx, geom, bbox, style);
        });
        break;
    }
  };

  // Main drawing function
  const drawGeoJSON = () => {
    const canvas = canvasRef.current;
    if (!canvas || !geojson) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Set background
      ctx.fillStyle = "#f8fafc"; // slate-50
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      let geometries: any[] = [];

      // Extract geometries based on GeoJSON type
      if (geojson.type === "FeatureCollection") {
        geometries = geojson.features?.map((feature: any) => feature.geometry).filter(Boolean) || [];
      } else if (geojson.type === "Feature") {
        if (geojson.geometry) {
          geometries = [geojson.geometry];
        }
      } else if (geojson.type && geojson.coordinates) {
        geometries = [geojson];
      }



      if (geometries.length === 0) {
        // Draw "no data" message
        ctx.fillStyle = "#64748b"; // slate-500
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No geometries to display", canvasWidth / 2, canvasHeight / 2);
        return;
      }

      // Calculate bounding box for all geometries
      const allCoords = geometries.flatMap((geom) => extractCoordinates(geom));
      const bbox = calculateBoundingBox(allCoords);

      // Draw each geometry
      geometries.forEach((geometry) => {
        drawGeometry(ctx, geometry, bbox, defaultStyle);
      });

      setError(null);
    } catch (err) {
      console.error("Error drawing GeoJSON:", err);
      setError(`Error rendering GeoJSON: ${err instanceof Error ? err.message : 'Unknown error'}`);

      // Draw error message on canvas
      ctx.fillStyle = "#ef4444"; // red-500
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Error rendering GeoJSON", canvasWidth / 2, canvasHeight / 2);
    }
  };

  useEffect(() => {
    drawGeoJSON();
  }, [geojson, canvasWidth, canvasHeight]);

  if (error) {
    return (
      <div className={`${compact ? "mt-1" : "mt-2"} ${className}`}>
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? "mt-1" : "mt-2"} ${className}`}>
      <div className="border rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-auto bg-slate-50 dark:bg-slate-900"
          style={{ maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}