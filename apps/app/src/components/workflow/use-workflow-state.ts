import type { ObjectReference, WorkflowTrigger } from "@dafthunk/types";
import type {
  Connection,
  IsValidConnection,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  Edge as ReactFlowEdge,
  ReactFlowInstance,
  Node as ReactFlowNode,
} from "@xyflow/react";

import { useClipboard } from "./use-clipboard";
import { useGraphOperations } from "./use-graph-operations";
import { useGraphPersistence } from "./use-graph-persistence";
import { useLayout } from "./use-layout";
import type {
  ConnectionValidationState,
  NodeExecutionUpdate,
  NodeType,
  WorkflowEdgeType,
  WorkflowNodeType,
} from "./workflow-types";

interface UseWorkflowStateProps {
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  onNodesChangePersist?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChangePersist?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
  disabled?: boolean;
  nodeTypes?: NodeType[];
}

interface UseWorkflowStateReturn {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  reactFlowInstance: ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null;
  isNodeSelectorOpen: boolean;
  setIsNodeSelectorOpen: (open: boolean) => void;
  onNodesChange: OnNodesChange<ReactFlowNode<WorkflowNodeType>>;
  onEdgesChange: OnEdgesChange<ReactFlowEdge<WorkflowEdgeType>>;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeDragStart: () => void;
  onNodeDragStop: OnNodeDrag<ReactFlowNode<WorkflowNodeType>>;
  connectionValidationState: ConnectionValidationState;
  isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeType) => void;
  setReactFlowInstance: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    > | null
  ) => void;
  applyNodeExecutions: (updates: NodeExecutionUpdate[]) => void;
  updateNodeData: (
    nodeId: string,
    data:
      | Partial<WorkflowNodeType>
      | ((current: WorkflowNodeType) => Partial<WorkflowNodeType>)
  ) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteSelected: () => void;
  deselectAll: () => void;
  addTriggerNodes: (trigger: WorkflowTrigger) => void;
  removeTriggerNodes: () => void;
  duplicateNode: (nodeId: string) => void;
  duplicateSelected: () => void;
  applyLayout: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteFromClipboard: () => void;
  hasClipboardData: boolean;
}

export function useWorkflowState({
  initialNodes = [],
  initialEdges = [],
  onNodesChangePersist,
  onEdgesChangePersist,
  validateConnection,
  createObjectUrl,
  disabled = false,
  nodeTypes = [],
}: UseWorkflowStateProps): UseWorkflowStateReturn {
  // Core graph state and operations
  const graphOps = useGraphOperations({
    initialNodes,
    initialEdges,
    validateConnection,
    createObjectUrl,
    disabled,
    nodeTypes,
  });

  // Persistence (side-effect only)
  useGraphPersistence({
    nodes: graphOps.nodes,
    edges: graphOps.edges,
    disabled,
    isDraggingRef: graphOps.isDraggingRef,
    onNodesChangePersist,
    onEdgesChangePersist,
  });

  // Layout
  const { applyLayout } = useLayout({
    nodesRef: graphOps.nodesRef,
    edgesRef: graphOps.edgesRef,
    setNodes: graphOps.setNodes,
    reactFlowInstance: graphOps.reactFlowInstance,
    disabled,
  });

  // Clipboard & duplication
  const clipboard = useClipboard({
    nodes: graphOps.nodes,
    edges: graphOps.edges,
    selectedNodes: graphOps.selectedNodes,
    selectedEdges: graphOps.selectedEdges,
    setNodes: graphOps.setNodes,
    setEdges: graphOps.setEdges,
    deleteSelected: graphOps.deleteSelected,
    disabled,
    createObjectUrl,
  });

  // `useClipboard` and `useLayout` both take `disabled` and enforce it on each
  // operation, so this layer only composes — it does not re-gate.
  return {
    ...graphOps,
    applyLayout,
    duplicateNode: clipboard.duplicateNode,
    duplicateSelected: clipboard.duplicateSelected,
    copySelected: clipboard.copySelected,
    cutSelected: clipboard.cutSelected,
    pasteFromClipboard: clipboard.pasteFromClipboard,
    hasClipboardData: clipboard.hasClipboardData,
  };
}
