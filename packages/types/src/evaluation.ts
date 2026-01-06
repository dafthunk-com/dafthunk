/**
 * Evaluation status types
 */
export const EvaluationStatus = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type EvaluationStatusType =
  (typeof EvaluationStatus)[keyof typeof EvaluationStatus];

import type { ParameterValue } from "./workflow";

/**
 * A single test case in an evaluation dataset
 *
 * Input/Output Mapping Convention:
 * - Input: Maps node IDs to their input parameters (nodeId → { parameterName → value })
 *   Before execution, these values are injected into the corresponding node's input parameters
 * - Expected: Maps node IDs to their expected output values (nodeId → { outputName → value })
 *   After execution, outputs from these nodes are extracted and compared
 *
 * Example:
 * ```typescript
 * {
 *   id: "test-1",
 *   input: {
 *     "prompt-node": {
 *       "value": "What is 2+2?"      // Sets the "value" input on node "prompt-node"
 *     },
 *     "settings-node": {
 *       "temperature": 0.7,           // Sets multiple parameters on "settings-node"
 *       "maxTokens": 100
 *     }
 *   },
 *   expected: {
 *     "answer-node": {
 *       "value": "4"                  // Expects "value" output from "answer-node" to be "4"
 *     },
 *     "metadata-node": {
 *       "confidence": 0.95,           // Can check multiple outputs from same node
 *       "model": "claude-3"
 *     }
 *   }
 * }
 * ```
 */
export interface EvalTestCase {
  /** Unique identifier for the test case */
  id: string;
  /**
   * Input parameters to inject into workflow nodes
   * Structure: { [nodeId]: { [parameterName]: value } }
   * Each node can have multiple parameters set
   */
  input: Record<string, Record<string, ParameterValue>>;
  /**
   * Expected output values from workflow nodes
   * Structure: { [nodeId]: { [outputName]: value } }
   * Each node can have multiple outputs checked
   */
  expected: Record<string, Record<string, ParameterValue>>;
  /** Optional metadata for the test case */
  metadata?: Record<string, any>;
}

/**
 * Result of evaluating a single test case
 */
export interface EvalResult {
  /** Test case ID */
  testCaseId: string;
  /** Workflow execution ID */
  executionId: string;
  /** Whether the test passed */
  passed: boolean;
  /** Similarity score (0-1) if applicable */
  score?: number;
  /** Actual output values (nodeId → { outputName → value }) */
  actual: Record<string, Record<string, ParameterValue>>;
  /** Expected output values (nodeId → { outputName → value }) */
  expected: Record<string, Record<string, ParameterValue>>;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Aggregated scores for an evaluation run
 */
export interface EvaluationScores {
  /** Number of test cases that passed */
  passed: number;
  /** Number of test cases that failed */
  failed: number;
  /** Total number of test cases */
  total: number;
  /** Pass rate (0-1) */
  passRate: number;
  /** Average score across all test cases (0-1) */
  avgScore?: number;
}

/**
 * Evaluation run metadata
 */
export interface Evaluation {
  id: string;
  name: string;
  workflowId: string;
  status: EvaluationStatusType;
  scores?: EvaluationScores;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Request to create and run an evaluation
 */
export interface CreateEvaluationRequest {
  name: string;
  workflowId: string;
  testCases: EvalTestCase[];
}

/**
 * Response when creating an evaluation
 */
export interface CreateEvaluationResponse {
  id: string;
  name: string;
  workflowId: string;
  status: EvaluationStatusType;
  testCaseCount: number;
  createdAt: Date;
}

/**
 * Response when getting an evaluation
 */
export interface GetEvaluationResponse {
  evaluation: Evaluation;
  results?: EvalResult[];
}

/**
 * Response for listing evaluations
 */
export interface ListEvaluationsResponse {
  evaluations: Evaluation[];
}
