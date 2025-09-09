import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, {
  type ErrorInfo,
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Group } from "three";

import { Switch } from "@/components/ui/switch";

import { CameraController } from "./camera-controller";
import { GltfViewerErrorBoundary } from "./gltf-error-boundary";
import { GltfModel } from "./gltf-model";
import type { GltfViewerProps } from "./types";
import { checkWebGLSupport } from "./utils";

// glTF renderer
export const GltfViewer = React.memo(
  ({ parameter, objectUrl, compact }: GltfViewerProps) => {
    const renderID = useRef(Math.random().toString(36).substr(2, 9));
    const loadedSceneRef = useRef<Group | null>(null);
    const [sceneLoadTrigger, setSceneLoadTrigger] = useState(0);
    const [wireframeMode, setWireframeMode] = useState(false);
    const isWebGLSupported = useMemo(() => checkWebGLSupport(), []);

    const viewerDimensions = useMemo(
      () =>
        compact ? { width: 180, height: 180 } : { width: 320, height: 320 },
      [compact]
    );

    // Memoized Canvas style to prevent re-renders and ensure consistent sizing
    const canvasStyle = useMemo(
      () => ({
        width: `${viewerDimensions.width}px`,
        height: `${viewerDimensions.height}px`,
        maxWidth: `${viewerDimensions.width}px`,
        maxHeight: `${viewerDimensions.height}px`,
        minWidth: `${viewerDimensions.width}px`,
        minHeight: `${viewerDimensions.height}px`,
        display: "block", // Prevent any inline element spacing issues
        ...(compact
          ? {
              position: "absolute" as const,
              top: "0",
              left: "0",
              borderRadius: "4px",
            }
          : {}),
      }),
      [viewerDimensions, compact]
    );

    // Callback to update scene ref and trigger camera positioning
    const handleSceneLoad = useCallback((scene: Group) => {
      loadedSceneRef.current = scene;

      // Force camera positioning by triggering a re-render
      setSceneLoadTrigger((prev) => prev + 1);
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

    // Calculate aspect ratio for camera positioning
    const aspectRatio = viewerDimensions.width / viewerDimensions.height;

    return (
      <div className={compact ? "mt-1 space-y-2" : "mt-2 space-y-3"}>
        <GltfViewerErrorBoundary onError={handleError}>
          <div
            className={`${compact ? "relative" : "relative gltf-canvas-container"} bg-slate-50 dark:bg-slate-900 rounded border`}
            style={{
              width: viewerDimensions.width,
              height: viewerDimensions.height,
              ...(compact
                ? {
                    overflow: "visible", // Allow absolute Canvas to escape container bounds
                    zIndex: 1, // Ensure container doesn't interfere with Canvas z-index
                  }
                : {}),
            }}
          >
            <Canvas
              key={`gltf-canvas-${renderID.current}`} // Stable key per component instance
              camera={{
                position: [2, 2, 2],
                fov: 50,
                // near and far will be set dynamically based on model size
              }}
              style={canvasStyle}
              dpr={1} // Force device pixel ratio to 1 to prevent scaling
              resize={{ scroll: false, debounce: 0 }} // Disable automatic resizing
              onCreated={({ gl, size }) => {
                // Log initial state for debugging
                console.log(
                  "Canvas onCreated - initial size:",
                  size,
                  "intended:",
                  viewerDimensions,
                  "compact:",
                  compact
                );

                // Force Three.js to respect our exact dimensions immediately
                gl.setSize(
                  viewerDimensions.width,
                  viewerDimensions.height,
                  false
                );

                // Ensure DOM element matches our intended size (prevents any scaling animation)
                const canvas = gl.domElement;
                canvas.style.width = `${viewerDimensions.width}px`;
                canvas.style.height = `${viewerDimensions.height}px`;
                canvas.style.maxWidth = `${viewerDimensions.width}px`;
                canvas.style.maxHeight = `${viewerDimensions.height}px`;

                // Set pixel ratio to 1 to prevent any scaling calculations
                gl.setPixelRatio(1);
                gl.setClearColor("#000000"); // Black background for better model visibility

                // Add minimal context loss monitoring
                gl.domElement.addEventListener("webglcontextlost", (e) => {
                  console.error(
                    "WebGL Context Lost Event - preventing default"
                  );
                  e.preventDefault();
                });

                gl.domElement.addEventListener("webglcontextrestored", () => {
                  console.log("WebGL Context Restored Event");
                });

                // Add event isolation for GLTF viewer

                const stopEventPropagation = (e: Event) => {
                  // Allow right-click to pass through
                  if (
                    e.type === "contextmenu" ||
                    (e as MouseEvent).button === 2
                  ) {
                    return;
                  }

                  // Stop the event from bubbling to ReactFlow
                  e.stopPropagation();
                };

                // Add event listeners to canvas element
                // Use setTimeout to ensure OrbitControls has attached its listeners first
                setTimeout(() => {
                  canvas.addEventListener("mousedown", stopEventPropagation, {
                    capture: false,
                  });
                  canvas.addEventListener("mousemove", stopEventPropagation, {
                    capture: false,
                  });
                  canvas.addEventListener("mouseup", stopEventPropagation, {
                    capture: false,
                  });
                  canvas.addEventListener("touchstart", stopEventPropagation, {
                    capture: false,
                  });
                  canvas.addEventListener("touchmove", stopEventPropagation, {
                    capture: false,
                  });
                  canvas.addEventListener("touchend", stopEventPropagation, {
                    capture: false,
                  });
                }, 100);

                // Try intercepting wheel events on multiple parent levels to catch them after OrbitControls
                const containerDiv = canvas.parentElement; // The styled div container
                const outerDiv = containerDiv?.parentElement; // The error boundary div

                if (outerDiv) {
                  setTimeout(() => {
                    // Add wheel listener at a higher level in DOM tree to catch bubbling events
                    outerDiv.addEventListener(
                      "wheel",
                      (e: WheelEvent) => {
                        // Check if the event target is within our GLTF viewer
                        if (
                          canvas.contains(e.target as Node) ||
                          e.target === canvas
                        ) {
                          e.stopImmediatePropagation();
                        }
                      },
                      { capture: false }
                    );
                  }, 150);
                }
              }}
            >
              {/* Enhanced lighting setup for better model visibility */}
              <ambientLight intensity={0.6} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1.2}
                castShadow
              />
              <directionalLight position={[-10, -10, -5]} intensity={0.8} />
              <directionalLight position={[0, 10, 0]} intensity={0.6} />{" "}
              {/* Top light */}
              {/* Camera controller for dynamic positioning */}
              <CameraController
                sceneRef={loadedSceneRef}
                trigger={sceneLoadTrigger}
                viewportAspect={aspectRatio}
              />
              {/* glTF Model with Suspense inside Canvas */}
              <Suspense fallback={null}>
                <GltfModel
                  url={objectUrl}
                  onSceneLoad={handleSceneLoad}
                  wireframeMode={wireframeMode}
                />
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
  }
);
