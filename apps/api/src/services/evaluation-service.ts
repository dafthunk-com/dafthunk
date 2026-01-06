import type {
  EvalResult,
  EvalTestCase,
  EvaluationScores,
  EvaluationStatusType,
  Workflow,
} from "@dafthunk/types";
import { eq } from "drizzle-orm";
import { v7 as uuid } from "uuid";

import type { Bindings } from "../context";
import { createDatabase } from "../db";
import type { EvaluationInsert, EvaluationRow } from "../db/schema";
import { evaluations, EvaluationStatus } from "../db/schema";
import { WorkerRuntime } from "../runtime/worker-runtime";
import { DeploymentStore } from "../stores/deployment-store";
import { ExecutionStore } from "../stores/execution-store";
import { ObjectStore } from "../stores/object-store";

/**
 * Service for running AI evaluations on workflow deployments
 */
export class EvaluationService {
  private env: Bindings;
  private objectStore: ObjectStore;
  private executionStore: ExecutionStore;
  private deploymentStore: DeploymentStore;

  constructor(env: Bindings) {
    this.env = env;
    this.objectStore = new ObjectStore(env.RESSOURCES);
    this.executionStore = new ExecutionStore(env);
    this.deploymentStore = new DeploymentStore(env);
  }

  /**
   * Create a new evaluation run
   */
  async createEvaluation(
    name: string,
    deploymentId: string,
    testCases: EvalTestCase[],
    organizationId: string,
    userId: string
  ): Promise<EvaluationRow> {
    const db = createDatabase(this.env.DB);
    const evaluationId = uuid();
    const now = new Date();

    const evaluation: EvaluationInsert = {
      id: evaluationId,
      name,
      deploymentId,
      organizationId,
      status: EvaluationStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    await db.insert(evaluations).values(evaluation);

    // Store test cases in R2
    await this.saveTestCases(evaluationId, organizationId, testCases);

    // Start evaluation asynchronously
    this.runEvaluation(
      evaluationId,
      deploymentId,
      organizationId,
      userId
    ).catch((error) => {
      console.error(`Failed to run evaluation ${evaluationId}:`, error);
      this.updateEvaluationStatus(
        evaluationId,
        EvaluationStatus.ERROR,
        error.message
      ).catch(console.error);
    });

    return evaluation as EvaluationRow;
  }

  /**
   * Get an evaluation by ID
   */
  async getEvaluation(
    evaluationId: string,
    organizationId: string
  ): Promise<EvaluationRow | null> {
    const db = createDatabase(this.env.DB);
    const evaluation = await db.query.evaluations.findFirst({
      where: (evaluations, { eq, and }) =>
        and(
          eq(evaluations.id, evaluationId),
          eq(evaluations.organizationId, organizationId)
        ),
    });

    return evaluation || null;
  }

  /**
   * List evaluations for an organization
   */
  async listEvaluations(organizationId: string): Promise<EvaluationRow[]> {
    const db = createDatabase(this.env.DB);
    const evaluations = await db.query.evaluations.findMany({
      where: (evaluations, { eq }) =>
        eq(evaluations.organizationId, organizationId),
      orderBy: (evaluations, { desc }) => [desc(evaluations.createdAt)],
    });

    return evaluations;
  }

  /**
   * Get evaluation results from R2
   */
  async getEvaluationResults(
    evaluationId: string,
    organizationId: string
  ): Promise<EvalResult[]> {
    const key = `evaluations/${evaluationId}/results.json`;
    const object = await this.env.RESSOURCES.get(key);

    if (!object) {
      return [];
    }

    // Verify organizationId matches
    const storedOrgId = object.customMetadata?.organizationId;
    if (storedOrgId && storedOrgId !== organizationId) {
      throw new Error(`Access denied to evaluation ${evaluationId}`);
    }

    const text = await object.text();
    return JSON.parse(text) as EvalResult[];
  }

  /**
   * Save test cases to R2
   */
  private async saveTestCases(
    evaluationId: string,
    organizationId: string,
    testCases: EvalTestCase[]
  ): Promise<void> {
    const key = `evaluations/${evaluationId}/test-cases.json`;
    await this.env.RESSOURCES.put(key, JSON.stringify(testCases, null, 2), {
      httpMetadata: {
        contentType: "application/json",
      },
      customMetadata: {
        evaluationId,
        organizationId,
        testCaseCount: String(testCases.length),
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Load test cases from R2
   */
  private async loadTestCases(evaluationId: string): Promise<EvalTestCase[]> {
    const key = `evaluations/${evaluationId}/test-cases.json`;
    const object = await this.env.RESSOURCES.get(key);

    if (!object) {
      throw new Error(`Test cases not found for evaluation: ${evaluationId}`);
    }

    const text = await object.text();
    return JSON.parse(text) as EvalTestCase[];
  }

  /**
   * Run the evaluation workflow for all test cases
   */
  private async runEvaluation(
    evaluationId: string,
    deploymentId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    // Update status to running
    await this.updateEvaluationStatus(evaluationId, EvaluationStatus.RUNNING);

    try {
      // Load deployment workflow snapshot from R2
      const workflow =
        await this.deploymentStore.readWorkflowSnapshot(deploymentId);
      if (!workflow) {
        throw new Error(
          `Workflow snapshot not found for deployment: ${deploymentId}`
        );
      }

      const testCases = await this.loadTestCases(evaluationId);
      if (testCases.length === 0) {
        throw new Error(`No test cases found for evaluation ${evaluationId}`);
      }

      const results: EvalResult[] = [];

      // Execute workflow for each test case
      for (const testCase of testCases) {
        const result = await this.evaluateTestCase(
          testCase,
          workflow,
          organizationId,
          userId
        );
        results.push(result);
      }

      // Calculate scores
      const scores = this.calculateScores(results);

      // Save results to R2
      await this.saveEvaluationResults(evaluationId, organizationId, results);

      // Update evaluation with scores
      await this.updateEvaluationScores(evaluationId, scores);

      // Mark as completed
      await this.updateEvaluationStatus(
        evaluationId,
        EvaluationStatus.COMPLETED
      );
    } catch (error) {
      console.error(`Evaluation ${evaluationId} failed:`, error);
      await this.updateEvaluationStatus(
        evaluationId,
        EvaluationStatus.ERROR,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Inject test case inputs into workflow nodes
   *
   * For each node specified in the test inputs, sets the corresponding input parameters
   * Structure: inputs[nodeId][parameterName] = value
   */
  private injectTestInputs(
    workflow: Workflow,
    inputs: Record<string, Record<string, any>>
  ): Workflow {
    // Clone workflow to avoid mutations
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow)) as Workflow;

    // For each node that has test inputs
    for (const [nodeId, nodeInputs] of Object.entries(inputs)) {
      // Find the node in the workflow
      const node = modifiedWorkflow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        console.warn(
          `Test case references node "${nodeId}" which does not exist in workflow`
        );
        continue;
      }

      // Set each parameter on this node
      for (const [paramName, paramValue] of Object.entries(nodeInputs)) {
        const inputParam = node.inputs.find((i) => i.name === paramName);
        if (inputParam) {
          inputParam.value = paramValue;
        } else {
          console.warn(
            `Test case references parameter "${paramName}" on node "${nodeId}" which does not exist`
          );
        }
      }
    }

    return modifiedWorkflow;
  }

  /**
   * Extract outputs from workflow execution based on expected structure
   *
   * Returns outputs matching the expected structure: { nodeId: { outputName: value } }
   */
  private extractTestOutputs(
    nodeExecutions: any[],
    expected: Record<string, Record<string, any>>
  ): Record<string, Record<string, any>> {
    const actual: Record<string, Record<string, any>> = {};

    // For each node that has expected outputs
    for (const [nodeId, expectedOutputs] of Object.entries(expected)) {
      const nodeExecution = nodeExecutions.find((ne) => ne.nodeId === nodeId);

      if (!nodeExecution?.outputs) {
        // Node didn't execute or has no outputs - leave empty
        continue;
      }

      // Extract the specific outputs we're checking
      actual[nodeId] = {};
      for (const outputName of Object.keys(expectedOutputs)) {
        if (nodeExecution.outputs[outputName] !== undefined) {
          actual[nodeId][outputName] = nodeExecution.outputs[outputName];
        }
      }
    }

    return actual;
  }

  /**
   * Evaluate a single test case
   */
  private async evaluateTestCase(
    testCase: EvalTestCase,
    workflow: Workflow,
    organizationId: string,
    userId: string
  ): Promise<EvalResult> {
    try {
      // Get organization compute credits (simplified for MVP)
      const computeCredits = 10000; // TODO: Get from organization

      // Inject test case inputs into workflow
      const workflowWithInputs = this.injectTestInputs(
        workflow,
        testCase.input
      );

      // Execute workflow with test case inputs
      const runtime = new WorkerRuntime(this.env);
      const execution = await runtime.run(
        {
          workflow: workflowWithInputs,
          userId,
          organizationId,
          computeCredits,
          subscriptionStatus: "active",
        },
        uuid()
      );

      // Extract actual outputs based on expected structure
      const actual = this.extractTestOutputs(
        execution.nodeExecutions,
        testCase.expected
      );

      // Compare with expected outputs
      const passed = this.compareOutputs(actual, testCase.expected);

      return {
        testCaseId: testCase.id,
        executionId: execution.id,
        passed,
        actual,
        expected: testCase.expected,
      };
    } catch (error) {
      return {
        testCaseId: testCase.id,
        executionId: "",
        passed: false,
        actual: {},
        expected: testCase.expected,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Compare actual outputs with expected outputs (exact match for MVP)
   *
   * Compares nested structure: { nodeId: { outputName: value } }
   */
  private compareOutputs(
    actual: Record<string, Record<string, any>>,
    expected: Record<string, Record<string, any>>
  ): boolean {
    // Simple exact match comparison for MVP
    // TODO: Add fuzzy matching, LLM-as-judge, etc.

    // Check each expected node
    for (const [nodeId, expectedOutputs] of Object.entries(expected)) {
      const actualNodeOutputs = actual[nodeId];

      // If node doesn't exist in actual, fail
      if (!actualNodeOutputs) {
        return false;
      }

      // Check each expected output for this node
      for (const [outputName, expectedValue] of Object.entries(
        expectedOutputs
      )) {
        const actualValue = actualNodeOutputs[outputName];

        // Compare using JSON serialization for deep equality
        if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate aggregated scores from results
   */
  private calculateScores(results: EvalResult[]): EvaluationScores {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;
    const passRate = total > 0 ? passed / total : 0;

    return {
      passed,
      failed,
      total,
      passRate,
    };
  }

  /**
   * Save evaluation results to R2
   */
  private async saveEvaluationResults(
    evaluationId: string,
    organizationId: string,
    results: EvalResult[]
  ): Promise<void> {
    const key = `evaluations/${evaluationId}/results.json`;
    await this.env.RESSOURCES.put(key, JSON.stringify(results, null, 2), {
      httpMetadata: {
        contentType: "application/json",
      },
      customMetadata: {
        evaluationId,
        organizationId,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Update evaluation status
   */
  private async updateEvaluationStatus(
    evaluationId: string,
    status: EvaluationStatusType,
    error?: string
  ): Promise<void> {
    const db = createDatabase(this.env.DB);
    const updates: Partial<EvaluationRow> = {
      status,
      updatedAt: new Date(),
    };

    if (error) {
      updates.error = error;
    }

    if (
      status === EvaluationStatus.COMPLETED ||
      status === EvaluationStatus.ERROR
    ) {
      updates.completedAt = new Date();
    }

    await db
      .update(evaluations)
      .set(updates)
      .where(eq(evaluations.id, evaluationId));
  }

  /**
   * Update evaluation scores
   */
  private async updateEvaluationScores(
    evaluationId: string,
    scores: EvaluationScores
  ): Promise<void> {
    const db = createDatabase(this.env.DB);
    await db
      .update(evaluations)
      .set({
        scores: JSON.stringify(scores),
        updatedAt: new Date(),
      })
      .where(eq(evaluations.id, evaluationId));
  }
}
