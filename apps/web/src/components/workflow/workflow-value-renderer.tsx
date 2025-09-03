import { ObjectReference } from "@dafthunk/types";
import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { Component, type ErrorInfo, type ReactNode, Suspense, useCallback,useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { LoadingManager } from "three";
import * as THREE from "three";

import { CodeBlock } from "@/components/docs/code-block";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isObjectReference } from "@/services/object-service";

import { WorkflowParameter } from "./workflow-types";

interface WorkflowValueRendererProps {
  parameter: WorkflowParameter;
  createObjectUrl?: (objectReference: ObjectReference) => string;
  compact?: boolean;
  readonly?: boolean;
  onChange?: (value: any) => void;
}

// Format value for display
export const formatValue = (value: any, type: string): string => {
  if (value === undefined || value === null) return "";

  try {
    if (type === "audio" || type === "image" || type === "document") {
      return ""; // Don't display data as text for types handled by dedicated renderers
    } else if (type === "json") {
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
    console.warn("Error formatting value:", e);
    return String(value);
  }
};

// Image renderer
const ImageRenderer = ({
  parameter,
  compact,
  objectUrl,
  readonly,
}: {
  parameter: WorkflowParameter;
  compact?: boolean;
  objectUrl: string;
  readonly?: boolean;
}) => (
  <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
    <img
      src={objectUrl}
      alt={`${parameter.name} ${readonly ? "output" : "input"}`}
      className="w-full rounded-md border"
      onError={(e) => {
        console.error("Error loading image:", e);
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling?.classList.remove("hidden");
      }}
    />
    <div className="hidden text-sm text-red-500 p-2 bg-red-50 rounded-md mt-1 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
      Error displaying image. The data may be corrupted.
    </div>
  </div>
);

// Audio renderer
const AudioRenderer = ({
  audioUrl,
  onError,
  audioRef,
}: {
  audioUrl: string;
  onError: (e: React.SyntheticEvent<HTMLAudioElement, Event>) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}) => (
  <audio
    ref={audioRef}
    controls
    className="w-full"
    src={audioUrl}
    onError={onError}
  />
);

// 3D glTF Model Components
interface GltfModelProps {
  url: string;
}

// Custom hook for authenticated GLTF loading
function useAuthenticatedGLTF(url: string) {
  const extendLoader = useMemo(() => {
    return (loader: any) => {
      console.log('Extending GLTFLoader for authenticated requests');
      
      // Set withCredentials to include cookies/auth headers
      if (loader.manager && loader.manager.itemStart) {
        // Create a custom loading manager that includes credentials
        const manager = new LoadingManager();
        
        // Override the manager's load method to add credentials
        const originalResolveURL = manager.resolveURL?.bind(manager);
        if (originalResolveURL) {
          manager.resolveURL = function(url: string) {
            return originalResolveURL(url);
          };
        }
        
        loader.manager = manager;
      }
      
      // If the loader has a setWithCredentials method, use it
      if (typeof loader.setWithCredentials === 'function') {
        loader.setWithCredentials(true);
        console.log('Set withCredentials=true on GLTFLoader');
      }
      
      // If the loader supports request headers (some loaders do)
      if (typeof loader.setRequestHeader === 'function') {
        // Add any additional headers if needed
        console.log('GLTFLoader supports setRequestHeader');
      }
      
      // Override the load method to ensure credentials
      const originalLoad = loader.load.bind(loader);
      loader.load = function(url: string, onLoad?: any, onProgress?: any, onError?: any) {
        console.log('Loading glTF with authentication:', url);
        
        // Try to use fetch directly with credentials for better control
        fetch(url, { 
          credentials: 'include',
          method: 'GET'
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.arrayBuffer();
          })
          .then(buffer => {
            // Create a blob URL for the Three.js loader to use
            const blob = new Blob([buffer], { type: 'model/gltf-binary' });
            const blobUrl = URL.createObjectURL(blob);
            
            // Load using the blob URL (no auth needed)
            return originalLoad(blobUrl, (gltf: any) => {
              URL.revokeObjectURL(blobUrl); // Clean up
              if (onLoad) onLoad(gltf);
            }, onProgress, onError);
          })
          .catch(error => {
            console.error('Authenticated glTF fetch failed:', error);
            if (onError) onError(error);
          });
      };
    };
  }, []);

  return useGLTF(url, false, false, extendLoader);
}

// Camera positioning utility
const positionCameraForScene = (scene: Group, camera: THREE.Camera, viewportAspect: number = 1.0) => {
  try {
    // Calculate model bounds
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());


    // Calculate appropriate camera distance
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (maxDimension === 0 || !isFinite(maxDimension)) {
      console.warn('Invalid model dimensions, keeping default camera');
      return;
    }

    // Fine-tune distance for optimal centering
    const distanceMultiplier = 1.1; // Base distance for good framing
    const distance = maxDimension * distanceMultiplier;

    // Position camera at a diagonal angle above and to the side of the model
    // Adjust positioning slightly for square viewports to ensure better centering
    const cameraPos = new THREE.Vector3(
      center.x + distance * 0.6,  // Slightly less to the side for square viewport
      center.y + distance * 0.9,  // Slightly lower for better framing
      center.z + distance * 0.8   // More forward for better depth perception
    );


    // Update camera imperatively
    camera.position.copy(cameraPos);
    camera.lookAt(center);

    // Dynamically set camera properties based on distance and aspect ratio
    if (camera instanceof THREE.PerspectiveCamera) {
      const newFar = distance * 5; // 5x the distance to ensure we can see the entire model
      const newNear = Math.max(0.1, distance / 10000); // Prevent z-fighting but keep reasonable near
      
      // Adjust FOV to ensure good framing
      const fov = 50; // Default FOV
      
      camera.fov = fov;
      camera.near = newNear;
      camera.far = newFar;
      camera.updateProjectionMatrix(); // Required after changing camera parameters
    }


  } catch (error) {
    console.error('Camera positioning error:', error);
  }
};

// Hook to monitor scene ref and position camera when available
function useSceneCamera(sceneRef: React.RefObject<Group | null>, trigger: number, viewportAspect: number = 1.0) {
  const { camera, size } = useThree();
  const lastSceneUUID = useRef<string | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    
    // Calculate actual aspect ratio from Three.js size if available, fallback to provided aspect
    const actualAspect = size.width && size.height ? size.width / size.height : viewportAspect;
    

    if (!scene || !camera) {
      return;
    }

    // Only position camera if scene has changed (different UUID)
    if (scene.uuid === lastSceneUUID.current) {
      return;
    }
    lastSceneUUID.current = scene.uuid;
    positionCameraForScene(scene, camera, actualAspect);
  }, [trigger, viewportAspect, size.width, size.height]); // Re-run when trigger, aspect ratio, or size changes

  return null;
}

// Simple camera controller that monitors scene ref
function CameraController({ sceneRef, trigger, viewportAspect }: { sceneRef: React.RefObject<Group | null>, trigger: number, viewportAspect?: number }) {
  useSceneCamera(sceneRef, trigger, viewportAspect);
  return null;
}


function GltfModel({ url, onSceneLoad, wireframeMode }: GltfModelProps & { onSceneLoad?: (scene: Group) => void; wireframeMode?: boolean }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useAuthenticatedGLTF(url);

  
  useEffect(() => {
    if (scene) {
      
      // Fix material issues
      scene.traverse((child) => {
        if (child.type === 'Mesh') {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mat = mesh.material as THREE.Material;

            // Force material to be visible and properly configured
            mat.visible = true;
            mat.transparent = false;
            mat.opacity = 1.0;

            // Set wireframe mode (only for materials that support it)
            if ('wireframe' in mat) {
              (mat as any).wireframe = wireframeMode || false;
            }

            // If it's a MeshStandardMaterial, ensure it responds to lights
            if (mat.type === 'MeshStandardMaterial') {
              const stdMat = mat as THREE.MeshStandardMaterial;
              stdMat.needsUpdate = true;
            }
          }
        }
      });

      // Pass scene to parent for camera positioning
      if (onSceneLoad) {
        onSceneLoad(scene);
      }
    }
  }, [scene, onSceneLoad, wireframeMode]);

  if (!scene) {
    return null;
  }

  return <primitive ref={groupRef} object={scene} />;
}


class GltfViewerErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error, errorInfo: ErrorInfo) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: Error, errorInfo: ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('=== Enhanced 3D Error Boundary ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error name:', error.name);
    console.error('Full error object:', error);
    console.error('Full errorInfo object:', errorInfo);
    
    // Check for specific Three.js/glTF related errors
    const isThreeJSError = error.message.includes('THREE') || 
                          error.message.includes('glTF') || 
                          error.message.includes('GLTFLoader') ||
                          error.stack?.includes('three');
    console.error('Is Three.js related error:', isThreeJSError);
    
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-red-50 dark:bg-red-900 rounded border border-red-200 dark:border-red-800">
          <div className="flex flex-col items-center space-y-2 text-center p-4">
            <div className="w-8 h-8 text-red-500 dark:text-red-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <span className="text-sm text-red-600 dark:text-red-400">
              3D Rendering Error
            </span>
            <span className="text-xs text-red-500 dark:text-red-300">
              WebGL may not be supported in your browser
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

// glTF renderer
const GltfRenderer = React.memo(({
  parameter,
  objectUrl,
  compact,
}: {
  parameter: WorkflowParameter;
  objectUrl: string;
  compact?: boolean;
}) => {
  const renderID = useRef(Math.random().toString(36).substr(2, 9));
  const loadedSceneRef = useRef<Group | null>(null);
  const [sceneLoadTrigger, setSceneLoadTrigger] = useState(0);
  const [wireframeMode, setWireframeMode] = useState(false);
  const isWebGLSupported = useMemo(() => checkWebGLSupport(), []);



  // Callback to update scene ref and trigger camera positioning
  const handleSceneLoad = useCallback((scene: Group) => {
    loadedSceneRef.current = scene;
    
    // Force camera positioning by triggering a re-render
    setSceneLoadTrigger(prev => prev + 1);
  }, []);


  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error("3D Viewer Error:", error);
    console.error("Error Info:", errorInfo);
  };

  if (!isWebGLSupported) {
    return (
      <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
        <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                3D Preview Unavailable
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                WebGL is not supported in your browser
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-neutral-500">
          glTF Model ({parameter.value.mimeType})
        </div>
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline flex items-center"
        >
          Download GLB File
        </a>
      </div>
    );
  }

  const viewerDimensions = compact
    ? { width: 180, height: 180 }
    : { width: 320, height: 320 };

  // Calculate aspect ratio for camera positioning
  const aspectRatio = viewerDimensions.width / viewerDimensions.height;

  return (
    <div className={compact ? "mt-1 space-y-2" : "mt-2 space-y-3"}>
      <GltfViewerErrorBoundary onError={handleError}>
        <div
          className="relative bg-slate-50 dark:bg-slate-900 rounded border"
          style={{ width: viewerDimensions.width, height: viewerDimensions.height }}
        >
          <Canvas
              key={`gltf-canvas-${renderID.current}`} // Stable key per component instance
              camera={{
                position: [2, 2, 2],
                fov: 50,
                // near and far will be set dynamically based on model size
              }}
              style={{ width: "100%", height: "100%" }}
              onCreated={({ gl }) => {
                // Add minimal context loss monitoring
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                  console.error('WebGL Context Lost Event - preventing default');
                  e.preventDefault();
                });
                
                gl.domElement.addEventListener('webglcontextrestored', () => {
                  console.log('WebGL Context Restored Event');
                });
                
                // Add event isolation for GLTF viewer
                const canvas = gl.domElement;
                
                const stopEventPropagation = (e: Event) => {
                  // Allow right-click to pass through
                  if (e.type === 'contextmenu' || (e as MouseEvent).button === 2) {
                    return;
                  }
                  
                  // Stop the event from bubbling to ReactFlow
                  e.stopPropagation();
                };
                
                // Add event listeners to canvas element
                // Use setTimeout to ensure OrbitControls has attached its listeners first
                setTimeout(() => {
                  canvas.addEventListener('mousedown', stopEventPropagation, { capture: false });
                  canvas.addEventListener('mousemove', stopEventPropagation, { capture: false });
                  canvas.addEventListener('mouseup', stopEventPropagation, { capture: false });
                  canvas.addEventListener('touchstart', stopEventPropagation, { capture: false });
                  canvas.addEventListener('touchmove', stopEventPropagation, { capture: false });
                  canvas.addEventListener('touchend', stopEventPropagation, { capture: false });
                }, 100);

                // Try intercepting wheel events on multiple parent levels to catch them after OrbitControls
                const containerDiv = canvas.parentElement; // The styled div container
                const outerDiv = containerDiv?.parentElement; // The error boundary div
                
                if (outerDiv) {
                  setTimeout(() => {
                    // Add wheel listener at a higher level in DOM tree to catch bubbling events
                    outerDiv.addEventListener('wheel', (e: WheelEvent) => {
                      // Check if the event target is within our GLTF viewer
                      if (canvas.contains(e.target as Node) || e.target === canvas) {
                        e.stopImmediatePropagation();
                      }
                    }, { capture: false });
                  }, 150);
                }

                
                gl.setClearColor("#000000"); // Black background for better model visibility
                gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              }}
            >
              {/* Enhanced lighting setup for better model visibility */}
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
              <directionalLight position={[-10, -10, -5]} intensity={0.8} />
              <directionalLight position={[0, 10, 0]} intensity={0.6} /> {/* Top light */}

              {/* Camera controller for dynamic positioning */}
              <CameraController sceneRef={loadedSceneRef} trigger={sceneLoadTrigger} viewportAspect={aspectRatio} />

              {/* glTF Model with Suspense inside Canvas */}
              <Suspense fallback={null}>
                <GltfModel url={objectUrl} onSceneLoad={handleSceneLoad} wireframeMode={wireframeMode} />
              </Suspense>

              {/* Camera controls */}
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={false}
                autoRotateSpeed={2}
                dampingFactor={0.1}
                enableDamping={true}
              />
            </Canvas>
        </div>
      </GltfViewerErrorBoundary>

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          glTF Model ({parameter.value.mimeType})
        </div>
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center"
        >
          Download GLB File
        </a>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="wireframe-mode"
            checked={wireframeMode}
            onCheckedChange={setWireframeMode}
          />
          <label
            htmlFor="wireframe-mode"
            className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer"
          >
            Wireframe
          </label>
        </div>
      </div>
    </div>
  );
});

// Document renderer
const DocumentRenderer = ({
  parameter,
  objectUrl,
  compact,
}: {
  parameter: WorkflowParameter;
  objectUrl: string;
  compact?: boolean;
}) => {
  const isPDF = parameter.value.mimeType === "application/pdf";
  const isImage = parameter.value.mimeType.startsWith("image/");

  if (isPDF) {
    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">PDF Document</span>
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
          className={`w-full rounded-md border nowheel ${compact ? "h-32" : "h-64"}`}
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">Document (Image)</span>
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
          alt={`${parameter.name} document`}
          className="w-full rounded-md border"
        />
      </div>
    );
  }

  // For other document types, just show a link
  return (
    <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
      <a
        href={objectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-500 hover:underline flex items-center"
      >
        View Document ({parameter.value.mimeType.split("/")[1]})
      </a>
    </div>
  );
};

// Geometry renderer for GeoJSON geometries
const GeoJSONRenderer = ({
  parameter,
  compact,
  readonly,
  onChange,
}: {
  parameter: WorkflowParameter;
  compact?: boolean;
  readonly?: boolean;
  onChange?: (value: any) => void;
}) => {
  const getGeometryTypeLabel = (type: string): string => {
    switch (type) {
      case "point":
        return "Point";
      case "multipoint":
        return "MultiPoint";
      case "linestring":
        return "LineString";
      case "multilinestring":
        return "MultiLineString";
      case "polygon":
        return "Polygon";
      case "multipolygon":
        return "MultiPolygon";
      case "geometry":
        return "Geometry";
      case "geometrycollection":
        return "GeometryCollection";
      case "feature":
        return "Feature";
      case "featurecollection":
        return "FeatureCollection";
      default:
        return "GeoJSON";
    }
  };

  const formatGeoJSON = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      console.warn("Error formatting GeoJSON:", e);
      return String(value);
    }
  };

  const renderGeoJSONSvg = (geojson: any) => {
    if (!geojson) {
      return { svg: "", error: null };
    }

    try {
      const options: GeoJSONSvgOptions = {
        width: 400,
        height: 300,
        strokeColor: "#3b82f6",
        strokeWidth: 2,
        fillColor: "rgba(59, 130, 246, 0.2)",
        backgroundColor: "#f8fafc",
      };

      const result = geojsonToSvg(geojson, options);

      // Make SVG responsive with 100% width
      if (result.svg && !result.error) {
        const responsiveSvg = result.svg
          .replace(/width="[^"]*"/, 'width="100%"')
          .replace(/height="[^"]*"/, 'height="auto"')
          .replace(
            /<svg([^>]*)>/,
            `<svg$1 viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">`
          );

        return { svg: responsiveSvg, error: result.error };
      }

      return { svg: result.svg, error: result.error };
    } catch (err) {
      console.error("Error rendering GeoJSON:", err);
      return {
        svg: "",
        error: `Error rendering GeoJSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  };

  const formattedValue = formatGeoJSON(parameter.value);
  const geometryLabel = getGeometryTypeLabel(parameter.type);

  if (readonly) {
    const result = renderGeoJSONSvg(parameter.value);

    return (
      <div className={compact ? "mt-1 space-y-2" : "mt-2 space-y-3"}>
        {result.error ? (
          <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
            {result.error}
          </div>
        ) : result.svg ? (
          <div className="border rounded-md bg-slate-50 dark:bg-slate-900">
            <div
              className="w-full"
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
          </div>
        ) : (
          <div className="border rounded-md bg-slate-50 dark:bg-slate-900 p-4 text-center">
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              No geometries to display
            </span>
          </div>
        )}
        <CodeRenderer
          value={formattedValue}
          type="json"
          compact={compact}
          readonly={readonly}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className={compact ? "mt-1 space-y-2" : "mt-2 space-y-3"}>
      {parameter.value &&
        (() => {
          const result = renderGeoJSONSvg(parameter.value);

          if (result.error) {
            return (
              <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800">
                {result.error}
              </div>
            );
          }

          if (result.svg) {
            return (
              <div className="border rounded-md bg-slate-50 dark:bg-slate-900">
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: result.svg }}
                />
              </div>
            );
          }

          return (
            <div className="border rounded-md bg-slate-50 dark:bg-slate-900 p-4 text-center">
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                No geometries to display
              </span>
            </div>
          );
        })()}

      <Textarea
        value={formattedValue}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange?.(parsed);
          } catch {
            // Allow invalid JSON while typing
            onChange?.(e.target.value);
          }
        }}
        className="text-xs font-mono min-h-[120px]"
        placeholder={`Enter ${geometryLabel} GeoJSON`}
      />
    </div>
  );
};

// Code renderer for JSON, arrays, and other code-like content
const CodeRenderer = ({
  value,
  type,
  compact,
  readonly,
  onChange,
}: {
  value: string;
  type: string;
  compact?: boolean;
  readonly?: boolean;
  onChange?: (value: any) => void;
}) => {
  // Determine the language based on the type
  const getLanguage = (type: string): string => {
    switch (type) {
      case "json":
        return "json";
      case "javascript":
      case "js":
        return "javascript";
      case "typescript":
      case "ts":
        return "typescript";
      case "python":
      case "py":
        return "python";
      case "html":
        return "html";
      case "css":
        return "css";
      case "sql":
        return "sql";
      case "yaml":
      case "yml":
        return "yaml";
      case "xml":
        return "xml";
      default:
        return "text";
    }
  };

  if (readonly) {
    return (
      <div
        className={
          "border rounded-md bg-muted overflow-auto " +
          `${compact ? "mt-1 h-32" : "mt-2"}`
        }
      >
        <CodeBlock
          language={getLanguage(type)}
          className="text-xs my-0 [&_pre]:p-2"
        >
          {value}
        </CodeBlock>
      </div>
    );
  }

  return (
    <div className={compact ? "mt-1" : "mt-2"}>
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="text-xs font-mono min-h-[100px]"
        placeholder={`Enter ${type} value`}
      />
    </div>
  );
};

// Text renderer for simple text content
const TextRenderer = ({
  value,
  type,
  compact,
  readonly,
  onChange,
}: {
  value: string;
  type: string;
  compact?: boolean;
  readonly?: boolean;
  onChange?: (value: any) => void;
}) => {
  if (readonly) {
    return (
      <div
        className={
          compact
            ? "text-xs p-1 mt-1 bg-secondary/50 rounded border whitespace-pre-line max-h-[300px] overflow-y-auto nowheel"
            : "w-full p-2 bg-secondary/50 rounded-md border border-border whitespace-pre-line"
        }
      >
        {value}
      </div>
    );
  }

  if (type === "string") {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`text-sm min-h-[80px] resize-y ${
          readonly ? "opacity-70 cursor-not-allowed" : ""
        }`}
        disabled={readonly}
        placeholder={`Enter ${type} value`}
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`text-sm h-8 ${
        readonly ? "opacity-70 cursor-not-allowed" : ""
      }`}
      disabled={readonly}
      placeholder={`Enter ${type} value`}
    />
  );
};

export function WorkflowValueRenderer({
  parameter,
  createObjectUrl,
  compact = false,
  readonly = false,
  onChange,
}: WorkflowValueRendererProps) {
  const [_error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset error state when parameter changes
    setError(null);
  }, [parameter]);

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    console.error("Audio playback error:", e);
    if (audioRef.current) {
      console.log("Audio element error:", audioRef.current.error);
      const errorMessage =
        audioRef.current.error?.message || "Unknown audio playback error";
      setError(`Error playing audio: ${errorMessage}`);
    }
  };

  if (
    (parameter.value === null || parameter.value === undefined) &&
    !onChange
  ) {
    return (
      <div
        className={
          compact
            ? "text-xs p-1 mt-1 bg-secondary/50 rounded border"
            : "w-full p-2 bg-secondary/50 rounded-md border border-border"
        }
      >
        No value
      </div>
    );
  }

  // Handle object references (files, images, etc.)
  if (
    parameter.value &&
    isObjectReference(parameter.value) &&
    createObjectUrl
  ) {
    const objectUrl = createObjectUrl(parameter.value);

    switch (parameter.type) {
      case "image":
        return (
          <ImageRenderer
            parameter={parameter}
            compact={compact}
            objectUrl={objectUrl}
          />
        );
      case "audio":
        return (
          <AudioRenderer
            audioUrl={objectUrl}
            onError={handleAudioError}
            audioRef={audioRef}
          />
        );
      case "document":
        return (
          <DocumentRenderer
            parameter={parameter}
            objectUrl={objectUrl}
            compact={compact}
          />
        );
      case "buffergeometry":
        return (
          <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
            <div className="text-xs text-neutral-500">
              3D Geometry ({parameter.value.mimeType})
            </div>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
            >
              Download Geometry Data
            </a>
          </div>
        );
      case "gltf":
        return (
          <GltfRenderer
            parameter={parameter}
            objectUrl={objectUrl}
            compact={compact}
          />
        );
      case "point":
      case "multipoint":
      case "linestring":
      case "multilinestring":
      case "polygon":
      case "multipolygon":
      case "geometry":
      case "geometrycollection":
      case "feature":
      case "featurecollection":
      case "geojson":
        return (
          <GeoJSONRenderer
            parameter={parameter}
            compact={compact}
            readonly={readonly}
            onChange={onChange}
          />
        );
      case "any":
        // For "any" type with object reference, try to determine the best renderer
        // based on the object reference properties
        if (parameter.value.mimeType) {
          if (parameter.value.mimeType.startsWith("image/")) {
            return (
              <ImageRenderer
                parameter={parameter}
                compact={compact}
                objectUrl={objectUrl}
              />
            );
          }
          if (parameter.value.mimeType.startsWith("audio/")) {
            return (
              <AudioRenderer
                audioUrl={objectUrl}
                onError={handleAudioError}
                audioRef={audioRef}
              />
            );
          }
          if (parameter.value.mimeType === "application/x-buffer-geometry") {
            return (
              <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
                <div className="text-xs text-neutral-500">
                  3D Geometry ({parameter.value.mimeType})
                </div>
                <a
                  href={objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center"
                >
                  Download Geometry Data
                </a>
              </div>
            );
          }
          if (parameter.value.mimeType === "model/gltf-binary") {
            return (
              <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
                <div className="text-xs text-neutral-500">
                  glTF Model ({parameter.value.mimeType})
                </div>
                <a
                  href={objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center"
                >
                  Download GLB File
                </a>
              </div>
            );
          }
          if (
            parameter.value.mimeType === "application/pdf" ||
            parameter.value.mimeType.startsWith("application/") ||
            parameter.value.mimeType.startsWith("text/")
          ) {
            return (
              <DocumentRenderer
                parameter={parameter}
                objectUrl={objectUrl}
                compact={compact}
              />
            );
          }
        }
        // Fallback for any type with object reference
        return (
          <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
            <div className="text-xs text-neutral-500">
              File ({parameter.value.mimeType || "unknown type"})
            </div>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center"
            >
              View File
            </a>
          </div>
        );
      default:
        return (
          <div className="text-sm text-orange-500">
            Unsupported object type: {parameter.type}
          </div>
        );
    }
  }

  // Handle geometry types
  if (
    parameter.type === "point" ||
    parameter.type === "multipoint" ||
    parameter.type === "linestring" ||
    parameter.type === "multilinestring" ||
    parameter.type === "polygon" ||
    parameter.type === "multipolygon" ||
    parameter.type === "geometry" ||
    parameter.type === "geometrycollection" ||
    parameter.type === "feature" ||
    parameter.type === "featurecollection" ||
    parameter.type === "geojson"
  ) {
    return (
      <GeoJSONRenderer
        parameter={parameter}
        compact={compact}
        readonly={readonly}
        onChange={onChange}
      />
    );
  }

  // Handle code-like content
  if (parameter.type === "json") {
    const formattedValue = formatValue(parameter.value, parameter.type);
    return (
      <CodeRenderer
        value={formattedValue}
        type={parameter.type}
        compact={compact}
        readonly={readonly}
        onChange={onChange}
      />
    );
  }

  // Handle any type
  if (parameter.type === "any") {
    // Try to determine the best way to display the value
    if (parameter.value === null || parameter.value === undefined) {
      return <div className="text-sm text-neutral-500 italic">No value</div>;
    }

    // If it's an object use JSON formatting
    if (Array.isArray(parameter.value) || typeof parameter.value === "object") {
      const formattedValue = JSON.stringify(parameter.value, null, 2);
      return (
        <div className="space-y-1">
          <div className="text-xs text-neutral-500">
            Any type (contains json)
          </div>
          <CodeRenderer
            value={formattedValue}
            type="json"
            compact={compact}
            readonly={readonly}
            onChange={onChange}
          />
        </div>
      );
    }

    const actualType = typeof parameter.value;

    // For primitive values, use text renderer
    const formattedValue = formatValue(parameter.value, actualType);
    return (
      <div className="space-y-1">
        <div className="text-xs text-neutral-500">
          Any type (contains {actualType})
        </div>
        <TextRenderer
          value={formattedValue}
          type={actualType}
          compact={compact}
          readonly={readonly}
          onChange={onChange}
        />
      </div>
    );
  }

  // Handle simple text content
  const formattedValue = formatValue(parameter.value, parameter.type);
  return (
    <TextRenderer
      value={formattedValue}
      type={parameter.type}
      compact={compact}
      readonly={readonly}
      onChange={onChange}
    />
  );
}
