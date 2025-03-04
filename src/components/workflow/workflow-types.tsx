import {
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  Connection,
  NodeChange,
  EdgeChange,
  OnConnectStart,
  OnConnectEnd,
  OnConnect,
  ReactFlowInstance,
} from "reactflow";

// Node Types
export type NodeExecutionState = "idle" | "executing" | "completed" | "error";

// Parameter Types
export interface WorkflowParameter {
  id: string;
  type: string;
  label: string;
  value?: any;
}

export interface WorkflowNodeData {
  label: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
}

// Edge Types
export interface WorkflowEdgeData {
  isValid?: boolean;
  isActive?: boolean;
  sourceType?: string;
  targetType?: string;
}

// Node Template Types
export interface NodeTemplate {
  id: string;
  type: string;
  label: string;
  description: string;
  category: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
}

// Canvas Types
export type ConnectionValidationState = "default" | "valid" | "invalid";

export interface WorkflowCanvasProps {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  connectionValidationState: ConnectionValidationState;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onEdgeClick: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onPaneClick: () => void;
  onInit: (instance: ReactFlowInstance) => void;
  onAddNode?: () => void;
  onExecute?: (e: React.MouseEvent) => void;
  onClean?: (e: React.MouseEvent) => void;
  showControls?: boolean;
}

// Workflow State Types
export interface WorkflowData {
  id: string;
  name: string;
  nodes: ReactFlowNode<WorkflowNodeData>[];
  edges: ReactFlowEdge<WorkflowEdgeData>[];
}

export interface UseWorkflowStateProps {
  initialNodes?: ReactFlowNode<WorkflowNodeData>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeData>[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeData>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
}

export interface UseWorkflowStateReturn {
  nodes: ReactFlowNode<WorkflowNodeData>[];
  edges: ReactFlowEdge<WorkflowEdgeData>[];
  selectedNode: ReactFlowNode<WorkflowNodeData> | null;
  selectedEdge: ReactFlowEdge<WorkflowEdgeData> | null;
  reactFlowInstance: ReactFlowInstance | null;
  isNodeSelectorOpen: boolean;
  setIsNodeSelectorOpen: (open: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  connectionValidationState: ConnectionValidationState;
  handleNodeClick: (event: React.MouseEvent, node: ReactFlowNode) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  handlePaneClick: () => void;
  handleAddNode: () => void;
  handleNodeSelect: (template: NodeTemplate) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  updateNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateNodeOutputs: (nodeId: string, outputs: Record<string, any>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
}

// Execution Types
export type ExecutionEventType =
  | "node-start"
  | "node-complete"
  | "node-error"
  | "execution-complete"
  | "execution-error";

export interface ExecutionEvent {
  type: ExecutionEventType;
  nodeId?: string;
  error?: string;
  outputs?: Record<string, any>;
}

export interface UseWorkflowExecutionProps {
  workflowId: string;
  updateNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateNodeOutputs: (nodeId: string, outputs: Record<string, any>) => void;
  onExecutionStart?: () => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs?: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
  executeWorkflow?: (
    workflowId: string,
    callbacks: {
      onEvent: (event: ExecutionEvent) => void;
      onComplete: () => void;
      onError: (error: string) => void;
    }
  ) => void | (() => void);
}

// Component Props Types
export interface WorkflowNodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NodeTemplate) => void;
  templates?: NodeTemplate[];
}

export interface WorkflowNodeInspectorProps {
  node: ReactFlowNode<WorkflowNodeData> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
}

export interface WorkflowEdgeInspectorProps {
  edge: ReactFlowEdge<WorkflowEdgeData> | null;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
}

export interface WorkflowSidebarProps {
  node: ReactFlowNode<WorkflowNodeData> | null;
  edge: ReactFlowEdge<WorkflowEdgeData> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
}

export interface WorkflowErrorProps {
  message: string;
  details?: string;
}

export interface WorkflowBuilderProps {
  workflowId: string;
  initialNodes?: ReactFlowNode<WorkflowNodeData>[];
  initialEdges?: ReactFlowEdge<WorkflowEdgeData>[];
  nodeTemplates?: NodeTemplate[];
  onNodesChange?: (nodes: ReactFlowNode<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: ReactFlowEdge<WorkflowEdgeData>[]) => void;
  validateConnection?: (connection: Connection) => boolean;
  executeWorkflow?: (
    workflowId: string,
    callbacks: {
      onEvent: (event: ExecutionEvent) => void;
      onComplete: () => void;
      onError: (error: string) => void;
    }
  ) => void | (() => void);
  onExecutionStart?: () => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs?: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
}

// Type for TypeBadge component
export interface TypeBadgeProps {
  type: string;
  position: import("reactflow").Position;
  id: string;
}
