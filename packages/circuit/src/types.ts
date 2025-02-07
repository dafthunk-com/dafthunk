/**
 * Represents a port type in the circuit
 */
export type PortType = "void" | "number" | "string" | "boolean" | "object";

/**
 * Represents a port (input or output) in a node
 */
export interface Port {
  name: string;
  type: PortType;
}

/**
 * Represents the type of node in the circuit
 */
export type NodeType = "input" | "processor" | "output";

/**
 * Represents a node in the circuit
 */
export interface Node {
  id: string;
  name: string;
  type: NodeType;
  inputs: Port[];
  outputs: Port[];
  error?: string | null;
}

/**
 * Represents an edge (connection) between nodes
 */
export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

/**
 * Represents the entire circuit graph
 */
export interface Circuit {
  nodes: Node[];
  edges: Edge[];
} 