/**
 * A named set of input values a workflow can be executed against.
 *
 * A workflow's inputs come from two places, so an example has to carry both: the
 * literals on its input nodes, and — for a non-manual trigger — the payload the
 * trigger would have delivered. An example covering only the first could not
 * exercise an email-triggered workflow at all.
 *
 * Examples are also the unit a judge would score, which is why they are named
 * and plural rather than one anonymous "test input" per workflow.
 */
export interface WorkflowExample {
  id: string;
  /** Unique within the workflow, e.g. "Urgent email". */
  name: string;
  description?: string;
  /** Used by Run when no example is named explicitly. At most one per workflow. */
  isDefault: boolean;
  /**
   * nodeId → inputName → value. Blob-typed values hold an `ObjectReference`,
   * which the runtime already accepts as a literal and resolves before the node
   * runs.
   *
   * Keyed by node id, so deleting and re-adding a node strands its values. A
   * stranded value is kept in the document and skipped at execution time, so
   * re-adding a node under its old id brings its values back.
   */
  nodeValues: Record<string, Record<string, unknown>>;
  /** Trigger-shaped payload; the fields depend on the workflow's trigger. */
  trigger?: Record<string, unknown>;
  /**
   * Reserved for LLM-as-judge. Nothing reads it yet; it exists so adding a judge
   * does not require reshaping stored examples.
   */
  expectation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowExampleRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
  nodeValues?: Record<string, Record<string, unknown>>;
  trigger?: Record<string, unknown>;
  expectation?: string;
}

export type UpdateWorkflowExampleRequest =
  Partial<CreateWorkflowExampleRequest>;

export interface ListWorkflowExamplesResponse {
  examples: WorkflowExample[];
}

export interface WorkflowExampleResponse {
  example: WorkflowExample;
}
