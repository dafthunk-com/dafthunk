// Types for workflows
import { NodeParameter, NodeParameterConstructor } from "./nodeParameterTypes";

export interface Parameter {
  name: string;
  type: NodeParameterConstructor;
  description?: string;
  value?: NodeParameter;
  hidden?: boolean;
  required?: boolean;
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
