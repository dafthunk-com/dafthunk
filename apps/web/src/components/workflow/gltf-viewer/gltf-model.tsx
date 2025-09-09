import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import * as THREE from "three";

import { useAuthenticatedGLTF } from "./gltf-loader";
import type { GltfModelProps } from "./types";
import { cloneSceneWithMaterials } from "./utils";

export function GltfModel({ url, onSceneLoad, wireframeMode }: GltfModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useAuthenticatedGLTF(url);

  // Clone the scene once per loaded source to isolate materials/textures
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    return cloneSceneWithMaterials(scene as any);
  }, [scene]);

  useEffect(() => {
    if (clonedScene) {
      // Fix material issues
      clonedScene.traverse((child) => {
        if ((child as any).isMesh) {
          const mesh = child as any;
          if (mesh.material) {
            const mat = mesh.material as THREE.Material;

            mat.visible = true;
            (mat as any).transparent = true;

            if ("wireframe" in mat) {
              (mat as any).wireframe = wireframeMode || false;
            }

            if (mat.type === "MeshStandardMaterial") {
              const stdMat = mat as THREE.MeshStandardMaterial;
              stdMat.needsUpdate = true;
            }
          }
        }
      });

      if (onSceneLoad) {
        onSceneLoad(clonedScene as any);
      }
    }
  }, [clonedScene, onSceneLoad, wireframeMode]);

  if (!clonedScene) {
    return null;
  }

  return <primitive ref={groupRef} object={clonedScene} />;
}
