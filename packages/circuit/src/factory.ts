import { Node, Edge, Port, NodeType, PortType, Circuit } from "./types";

/**
 * Creates a new port with the given name and type
 */
export function createPort(name: string, type: PortType): Port {
  return {
    name,
    type,
  };
}

/**
 * Creates a new node with the given parameters
 */
export function createNode(params: {
  id: string;
  name: string;
  type: NodeType;
  inputs: Array<{ name: string; type: PortType }>;
  outputs: Array<{ name: string; type: PortType }>;
}): Node {
  return {
    id: params.id,
    name: params.name,
    type: params.type,
    inputs: params.inputs.map((input) => createPort(input.name, input.type)),
    outputs: params.outputs.map((output) => createPort(output.name, output.type)),
    error: null,
  };
}

/**
 * Creates a new edge between nodes
 */
export function createEdge(params: {
  id: string;
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}): Edge {
  return {
    id: params.id,
    source: params.source,
    target: params.target,
    sourceOutput: params.sourceOutput,
    targetInput: params.targetInput,
  };
}

/**
 * Creates an empty circuit
 */
export function createEmptyCircuit(): Circuit {
  return {
    nodes: [],
    edges: [],
  };
}

/**
 * Creates a new input node
 */
export function createInputNode(params: {
  id: string;
  name: string;
  outputType: PortType;
}): Node {
  return createNode({
    id: params.id,
    name: params.name,
    type: "input",
    inputs: [],
    outputs: [{ name: "output", type: params.outputType }],
  });
}

/**
 * Creates a new output node
 */
export function createOutputNode(params: {
  id: string;
  name: string;
  inputType: PortType;
}): Node {
  return createNode({
    id: params.id,
    name: params.name,
    type: "output",
    inputs: [{ name: "input", type: params.inputType }],
    outputs: [],
  });
}

/**
 * Creates a new processor node
 */
export function createProcessorNode(params: {
  id: string;
  name: string;
  inputs: Array<{ name: string; type: PortType }>;
  outputs: Array<{ name: string; type: PortType }>;
}): Node {
  return createNode({
    id: params.id,
    name: params.name,
    type: "processor",
    inputs: params.inputs,
    outputs: params.outputs,
  });
} 