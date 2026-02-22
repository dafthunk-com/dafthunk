/**
 * Feedback sentiment types
 */
export const FeedbackSentiment = {
  POSITIVE: "positive",
  NEGATIVE: "negative",
} as const;

export type FeedbackSentimentType =
  (typeof FeedbackSentiment)[keyof typeof FeedbackSentiment];

/**
 * A feedback criterion (evaluation question) for a workflow or deployment
 */
export interface FeedbackCriterion {
  id: string;
  workflowId: string;
  deploymentId?: string;
  question: string;
  description?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to create a feedback criterion
 */
export interface CreateFeedbackCriterionRequest {
  workflowId: string;
  question: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Request to update a feedback criterion
 */
export interface UpdateFeedbackCriterionRequest {
  question?: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Response for listing feedback criteria
 */
export interface ListFeedbackCriteriaResponse {
  criteria: FeedbackCriterion[];
}

/**
 * User feedback on a workflow execution (per criterion)
 */
export interface ExecutionFeedback {
  id: string;
  executionId: string;
  criterionId: string;
  criterionQuestion?: string;
  workflowId?: string;
  workflowName?: string;
  deploymentId?: string;
  deploymentVersion?: number;
  sentiment: FeedbackSentimentType;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to create execution feedback (single criterion)
 */
export interface CreateExecutionFeedbackRequest {
  executionId: string;
  criterionId: string;
  sentiment: FeedbackSentimentType;
  comment?: string;
}

/**
 * Upsert a single criterion's feedback (auto-save on click)
 */
export interface UpsertFeedbackRequest {
  executionId: string;
  criterionId: string;
  sentiment: FeedbackSentimentType;
  comment?: string;
}

/**
 * Batch create feedback for all criteria in one execution
 */
export interface BatchCreateFeedbackRequest {
  executionId: string;
  responses: Array<{
    criterionId: string;
    sentiment: FeedbackSentimentType;
    comment?: string;
  }>;
}

/**
 * Response when creating execution feedback
 */
export interface CreateExecutionFeedbackResponse {
  id: string;
  executionId: string;
  criterionId: string;
  workflowId?: string;
  deploymentId?: string;
  sentiment: FeedbackSentimentType;
  comment?: string;
  createdAt: Date;
}

/**
 * Response for batch feedback creation
 */
export interface BatchCreateFeedbackResponse {
  feedback: CreateExecutionFeedbackResponse[];
}

/**
 * Request to update execution feedback
 */
export interface UpdateExecutionFeedbackRequest {
  sentiment?: FeedbackSentimentType;
  comment?: string;
}

/**
 * Request to list feedback with filters and pagination
 */
export interface ListFeedbackRequest {
  workflowId?: string;
  sentiment?: FeedbackSentimentType;
  limit?: number;
  offset?: number;
}

/**
 * Response for listing execution feedback
 */
export interface ListExecutionFeedbackResponse {
  feedback: ExecutionFeedback[];
}
