export interface Parameter {
  name: string;
  type: string;
  description?: string;
}

export interface Node {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string;
}

export interface Edge {
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface NodeType {
  id: string;
  name: string;
  type: string;
  description: string;
  category: string;
  icon: string;
  inputs: Parameter[];
  outputs: Parameter[];
} 