import { CgsApplyMaterialNode } from "@dafthunk/runtime/nodes/3d/cgs-apply-material-node";
import { CgsCubeNode } from "@dafthunk/runtime/nodes/3d/cgs-cube-node";
import { CgsDifferenceNode } from "@dafthunk/runtime/nodes/3d/cgs-difference-node";
import { CgsSphereNode } from "@dafthunk/runtime/nodes/3d/cgs-sphere-node";
import { GltfOutputNode } from "@dafthunk/runtime/nodes/output/gltf-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const shape3dTemplate: WorkflowTemplate = {
  id: "3d-shape",
  name: "3D Shape",
  description: "Create a 3D shape by subtracting a sphere from a cube",
  icon: "box",
  trigger: "manual",
  tags: ["3d"],
  nodes: [
    CgsCubeNode.create({
      id: "cube",
      name: "Cube",
      position: { x: 100, y: 100 },
      inputs: {
        size: 2,
        center: false,
      },
    }),
    CgsSphereNode.create({
      id: "sphere",
      name: "Sphere",
      position: { x: 100, y: 300 },
      inputs: {
        radius: 1.3,
        widthSegments: 32,
        heightSegments: 32,
      },
    }),
    CgsDifferenceNode.create({
      id: "difference",
      name: "Difference",
      position: { x: 500, y: 200 },
    }),
    CgsApplyMaterialNode.create({
      id: "apply-material",
      name: "Apply Material",
      position: { x: 900, y: 200 },
      inputs: {
        color: "#4A90D9",
        metallic: 0.3,
        roughness: 0.4,
      },
    }),
    GltfOutputNode.create({
      id: "preview",
      name: "Result",
      position: { x: 1300, y: 200 },
    }),
  ],
  edges: [
    {
      source: "cube",
      target: "difference",
      sourceOutput: "mesh",
      targetInput: "meshA",
    },
    {
      source: "sphere",
      target: "difference",
      sourceOutput: "mesh",
      targetInput: "meshB",
    },
    {
      source: "difference",
      target: "apply-material",
      sourceOutput: "mesh",
      targetInput: "mesh",
    },
    {
      source: "apply-material",
      target: "preview",
      sourceOutput: "mesh",
      targetInput: "value",
    },
  ],
};
