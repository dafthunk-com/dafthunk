// Node Type API types

import { NodeType } from './workflow';

/**
 * Response for getting all available node types
 */
export interface GetNodeTypesResponse {
  nodeTypes: NodeType[];
} 