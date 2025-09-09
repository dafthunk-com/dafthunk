import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import type { CameraControllerProps } from "./types";
import { positionCameraForScene } from "./utils";

// Hook to monitor scene ref and position camera when available
function useSceneCamera(
  sceneRef: React.RefObject<import("three").Group | null>,
  trigger: number,
  viewportAspect: number = 1.0
) {
  const { camera, size } = useThree();
  const lastSceneUUID = useRef<string | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;

    // Calculate actual aspect ratio from Three.js size if available, fallback to provided aspect
    const actualAspect =
      size.width && size.height ? size.width / size.height : viewportAspect;

    if (!scene || !camera) {
      return;
    }

    // Only position camera if scene has changed (different UUID)
    if (scene.uuid === lastSceneUUID.current) {
      return;
    }
    lastSceneUUID.current = scene.uuid;
    positionCameraForScene(scene, camera as any, actualAspect);
  }, [trigger, viewportAspect, size.width, size.height, camera, sceneRef]); // Re-run when trigger, aspect ratio, or size changes

  return null;
}

// Simple camera controller that monitors scene ref
export function CameraController({
  sceneRef,
  trigger,
  viewportAspect,
}: CameraControllerProps) {
  useSceneCamera(sceneRef, trigger, viewportAspect);
  return null;
}
