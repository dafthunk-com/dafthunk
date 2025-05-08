import {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  ReactFlowInstance,
  IsValidConnection,
  OnNodesChange,
  OnEdgesChange,
} from "@xyflow/react";

// Node Types
export type NodeExecutionState = "idle" | "executing" | "completed" | "error";

// Audio data type
export interface AudioData {
  data: Uint8Array;
  mimeType: string;
}

// Parameter Types
export interface WorkflowParameter {
  id: string;
  type: string;
  name: string;
  value?: any;
  isConnected?: boolean;
  hidden?: boolean;
  required?: boolean;
}

export interface WorkflowNodeType extends Record<string, unknown> {
  name: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
}

// Edge Types
export interface WorkflowEdgeType extends Record<string, unknown> {
  isValid?: boolean;
  isActive?: boolean;
  sourceType?: string;
  targetType?: string;
}

// Node Template Types
export interface NodeTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  category: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
}

// Canvas Types
export type ConnectionValidationState = "default" | "valid" | "invalid";

export interface WorkflowCanvasProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  connectionValidationState?: ConnectionValidationState;
  onNodesChange: OnNodesChange<ReactFlowNode<WorkflowNodeType>>;
  onEdgesChange: OnEdgesChange<ReactFlowEdge<WorkflowEdgeType>>;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  onEdgeClick: (
    event: React.MouseEvent,
    edge: ReactFlowEdge<WorkflowEdgeType>
  ) => void;
  onPaneClick: () => void;
  onInit: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    >
  ) => void;
  onAddNode?: () => void;
  onAction?: (e: React.MouseEvent) => void;
  onDeploy?: (e: React.MouseEvent) => void;
  workflowStatus?: WorkflowExecutionStatus;
  onToggleSidebar?: (e: React.MouseEvent) => void;
  isSidebarVisible?: boolean;
  showControls?: boolean;
  isValidConnection?: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  readonly?: boolean;
}

// Workflow State Types
export interface WorkflowData {
  id: string;
  name: string;
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
}

export interface UseWorkflowStateProps {
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  readonly?: boolean;
}

export type NodeExecutionUpdate = {
  state?: NodeExecutionState;
  outputs?: Record<string, any>;
  error?: string;
};

export interface UseWorkflowStateReturn {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  selectedNode: ReactFlowNode<WorkflowNodeType> | null;
  selectedEdge: ReactFlowEdge<WorkflowEdgeType> | null;
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
  connectionValidationState: ConnectionValidationState;
  isValidConnection: IsValidConnection<ReactFlowEdge<WorkflowEdgeType>>;
  handleNodeClick: (
    event: React.MouseEvent,
    node: ReactFlowNode<WorkflowNodeType>
  ) => void;
  handleEdgeClick: (
    event: React.MouseEvent,
    edge: ReactFlowEdge<WorkflowEdgeType>
  ) => void;
  handlePaneClick: () => void;
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeTemplate) => void;
  setReactFlowInstance: (
    instance: ReactFlowInstance<
      ReactFlowNode<WorkflowNodeType>,
      ReactFlowEdge<WorkflowEdgeType>
    > | null
  ) => void;
  updateNodeExecution: (nodeId: string, update: NodeExecutionUpdate) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  deleteNode: (nodeId: string) => void;
}

// Component Props Types
export interface WorkflowNodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NodeTemplate) => void;
  templates?: NodeTemplate[];
}

export interface WorkflowNodeInspectorProps {
  node: ReactFlowNode<WorkflowNodeType> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  readonly?: boolean;
}

export interface WorkflowEdgeInspectorProps {
  edge: ReactFlowEdge<WorkflowEdgeType> | null;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  readonly?: boolean;
}

export interface WorkflowSidebarProps {
  node: ReactFlowNode<WorkflowNodeType> | null;
  edge: ReactFlowEdge<WorkflowEdgeType> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  readonly?: boolean;
}

export interface WorkflowErrorProps {
  message: string;
  details?: string;
}

export type WorkflowExecutionStatus =
  | "idle"
  | "executing"
  | "completed"
  | "error"
  | "cancelled"
  | "paused";

// Simplified local execution type to use in the workflow builder
export type WorkflowNodeExecution = {
  nodeId: string;
  status: NodeExecutionState;
  outputs?: Record<string, any>;
  error?: string;
};

export interface WorkflowBuilderProps {
  workflowId: string;
  initialNodes?: ReactFlowNode<WorkflowNodeType>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeType>[];
  nodeTemplates?: NodeTemplate[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  executeWorkflow?: (
    workflowId: string,
    onExecution: (execution: WorkflowExecution) => void
  ) => void | (() => void);
  initialWorkflowExecution?: WorkflowExecution;
  readonly?: boolean;
  onDeployWorkflow?: (e: React.MouseEvent) => void;
}

export interface TypeBadgeProps {
  type: string;
  position: import("@xyflow/react").Position;
  id: string;
}

export interface WorkflowExecution {
  status: WorkflowExecutionStatus;
  nodeExecutions: WorkflowNodeExecution[];
}
