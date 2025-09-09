import type { Group, Material, Mesh } from "three";
import * as THREE from "three";

export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export const positionCameraForScene = (
  scene: Group,
  camera: THREE.Camera,
  _viewportAspect: number = 1.0
) => {
  try {
    // Calculate model bounds
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate appropriate camera distance
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (maxDimension === 0 || !isFinite(maxDimension)) {
      console.warn("Invalid model dimensions, keeping default camera");
      return;
    }

    // Fine-tune distance for optimal centering
    const distanceMultiplier = 1.1; // Base distance for good framing
    const distance = maxDimension * distanceMultiplier;

    // Position camera at a diagonal angle above and to the side of the model
    // Adjust positioning slightly for square viewports to ensure better centering
    const cameraPos = new THREE.Vector3(
      center.x + distance * 0.6,
      center.y + distance * 0.9,
      center.z + distance * 0.8
    );

    camera.position.copy(cameraPos);
    camera.lookAt(center);

    if (camera instanceof THREE.PerspectiveCamera) {
      const newFar = distance * 5;
      const newNear = Math.max(0.1, distance / 10000);
      const fov = 50;

      camera.fov = fov;
      camera.near = newNear;
      camera.far = newFar;
      camera.updateProjectionMatrix();
    }
  } catch (error) {
    console.error("Camera positioning error:", error);
  }
};

// Clone a scene and ensure unique materials per instance
export function cloneSceneWithMaterials(source: Group): Group {
  const cloned = source.clone(true) as Group;

  const cloneMaterial = (mat: Material): Material => {
    const clonedMat = mat.clone();
    // Clone key textures if present
    const anyMat = clonedMat as any;
    if (anyMat.map) anyMat.map = anyMat.map.clone();
    if (anyMat.normalMap) anyMat.normalMap = anyMat.normalMap.clone();
    if (anyMat.roughnessMap) anyMat.roughnessMap = anyMat.roughnessMap.clone();
    if (anyMat.metalnessMap) anyMat.metalnessMap = anyMat.metalnessMap.clone();
    if (anyMat.emissiveMap) anyMat.emissiveMap = anyMat.emissiveMap.clone();
    anyMat.needsUpdate = true;
    return clonedMat;
  };

  cloned.traverse((child) => {
    const mesh = child as Mesh;
    if ((mesh as any).isMesh) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => cloneMaterial(m));
      } else if (mesh.material) {
        mesh.material = cloneMaterial(mesh.material);
      }
      // Optional: avoid culling artifacts across small canvases
      (mesh as any).frustumCulled = false;
    }
  });

  return cloned;
}
