import type { Group } from "three";

import type { WorkflowParameter } from "../workflow-types";

export interface GltfModelProps {
  url: string;
  onSceneLoad?: (scene: Group) => void;
  wireframeMode?: boolean;
}

export interface GltfViewerProps {
  parameter: WorkflowParameter;
  objectUrl: string;
  compact?: boolean;
}

export interface CameraControllerProps {
  sceneRef: React.RefObject<Group | null>;
  trigger: number;
  viewportAspect?: number;
}
