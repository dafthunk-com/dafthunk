import {
  JsonArray,
  JsonObject,
  Node,
  NodeExecutionStatus,
  ObjectReference,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { Bindings } from "../context";
import { createDatabase, ExecutionStatusType, saveExecution, getAllSecretsWithValues } from "../db";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../nodes/parameter-mapper";
import { HttpRequest, NodeContext } from "../nodes/types";
import { EmailMessage } from "../nodes/types";
import {
  getOrganizationComputeUsage,
  updateOrganizationComputeUsage,
} from "../utils/credits";
import { validateWorkflow } from "../utils/workflows";
import { ObjectStore } from "./object-store";

// Basic node output value types
export type BasicNodeOutputValue =
  | string
  | number
  | boolean
  | ObjectReference
  | JsonArray
  | JsonObject;

// Node output value can be a single value or array of values (for repeated parameters)
export type NodeOutputValue = BasicNodeOutputValue | BasicNodeOutputValue[];

export type NodeOutputs = Record<string, NodeOutputValue>;
export type NodeErrors = Map<string, string>;
export type WorkflowOutputs = Map<string, NodeOutputs>;
export type ExecutedNodeSet = Set<string>;

// Inline execution types
export type InlineGroup = {
  type: "inline";
  nodeIds: string[];
};

export type IndividualNode = {
  type: "individual";
  nodeId: string;
};

export type ExecutionUnit = InlineGroup | IndividualNode;
export type ExecutionPlan = ExecutionUnit[];

export type RuntimeParams = {
  workflow: Workflow;
  userId: string;
  organizationId: string;
  computeCredits: number;
  monitorProgress?: boolean;
  deploymentId?: string;
  httpRequest?: HttpRequest;
  emailMessage?: EmailMessage;
};

export type RuntimeState = {
  workflow: Workflow;
  nodeOutputs: WorkflowOutputs;
  executedNodes: ExecutedNodeSet;
  skippedNodes: ExecutedNodeSet;
  nodeErrors: NodeErrors;
  executionPlan: ExecutionPlan;
  status: WorkflowExecutionStatus;
};

/**
 * Executes a `Workflow` instance from start to finish.
 */
export class Runtime extends WorkflowEntrypoint<Bindings, RuntimeParams> {
  /**
   * Default step configuration used across the workflow.
   */
  private static readonly defaultStepConfig: WorkflowStepConfig = {
    retries: {
      limit: 0,
      delay: 10_000,
      backoff: "exponential",
    },
    timeout: "10 minutes",
  };

  private nodeRegistry: CloudflareNodeRegistry;
  private toolRegistry: CloudflareToolRegistry;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.nodeRegistry = new CloudflareNodeRegistry(env, true);
    this.toolRegistry = new CloudflareToolRegistry(
      this.nodeRegistry,
      this.createNodeContextForTool.bind(this)
    );
  }

  /**
   * Create a NodeContext for tool execution
   */
  private createNodeContextForTool(
    nodeId: string,
    inputs: Record<string, any>
  ): NodeContext {
    // Configure AI Gateway options
    const aiOptions: AiOptions = {};
    const gatewayId = this.env.CLOUDFLARE_AI_GATEWAY_ID;
    if (gatewayId) {
      aiOptions.gateway = {
        id: gatewayId,
        skipCache: false,
      };
    }

    return {
      nodeId,
      workflowId: `tool_execution_${Date.now()}`,
      organizationId: "system", // Tool executions are system-level
      inputs,
      toolRegistry: this.toolRegistry,
      secrets: {}, // Tool executions don't have access to organization secrets
      env: {
        DB: this.env.DB,
        AI: this.env.AI,
        AI_OPTIONS: aiOptions,
        RESSOURCES: this.env.RESSOURCES,
        DATASETS: this.env.DATASETS,
        DATASETS_AUTORAG: this.env.DATASETS_AUTORAG,
        CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_AI_GATEWAY_ID: this.env.CLOUDFLARE_AI_GATEWAY_ID,
        TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: this.env.TWILIO_PHONE_NUMBER,
        SENDGRID_API_KEY: this.env.SENDGRID_API_KEY,
        SENDGRID_DEFAULT_FROM: this.env.SENDGRID_DEFAULT_FROM,
        RESEND_API_KEY: this.env.RESEND_API_KEY,
        RESEND_DEFAULT_FROM: this.env.RESEND_DEFAULT_FROM,
        AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: this.env.AWS_REGION,
        SES_DEFAULT_FROM: this.env.SES_DEFAULT_FROM,
        EMAIL_DOMAIN: this.env.EMAIL_DOMAIN,
        OPENAI_API_KEY: this.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
        GEMINI_API_KEY: this.env.GEMINI_API_KEY,
      },
    };
  }

  /**
   * The main entrypoint called by the Workflows engine.
   */
  async run(event: WorkflowEvent<RuntimeParams>, step: WorkflowStep) {
    const {
      workflow,
      userId,
      organizationId,
      monitorProgress = false,
      httpRequest,
      emailMessage,
      computeCredits,
    } = event.payload;
    const instanceId = event.instanceId;

    // Initialise state and execution records.
    let runtimeState: RuntimeState = {
      workflow,
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      executionPlan: [],
      status: "submitted",
    };

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: event.payload.workflow.id,
      deploymentId: event.payload.deploymentId,
      status: "submitted",
      nodeExecutions: [],
      visibility: "private",
      startedAt: undefined,
      endedAt: undefined,
    } as WorkflowExecution;

    if (
      !(await this.hasEnoughComputeCredits(
        organizationId,
        computeCredits,
        this.getNodesComputeCost(workflow.nodes)
      ))
    ) {
      runtimeState = { ...runtimeState, status: "exhausted" };
      return await step.do(
        "persist exhausted execution state",
        Runtime.defaultStepConfig,
        async () =>
          this.saveExecutionState(
            userId,
            organizationId,
            workflow.id,
            instanceId,
            runtimeState,
            new Date(),
            new Date()
          )
      );
    }

    try {
      // Preload all organization secrets for synchronous access
      const secrets = await step.do(
        "preload organization secrets",
        Runtime.defaultStepConfig,
        async () => this.preloadAllSecrets(organizationId)
      );

      // Prepare workflow (validation + ordering).
      // @ts-ignore
      runtimeState = await step.do(
        "initialise workflow",
        Runtime.defaultStepConfig,
        async () => this.initialiseWorkflow(workflow)
      );

      const initialStartedAt = new Date();

      // Persist the "executing" status and startedAt time immediately
      executionRecord = await step.do(
        "persist initial execution status",
        Runtime.defaultStepConfig,
        async () =>
          this.saveExecutionState(
            userId,
            organizationId,
            workflow.id,
            instanceId,
            runtimeState, // runtimeState.status is "executing", executedNodes is empty
            initialStartedAt,
            undefined // endedAt is not yet set
          )
      );

      // Execute nodes sequentially.
      for (const executionUnit of runtimeState.executionPlan) {
        if (executionUnit.type === "individual") {
          const nodeIdentifier = executionUnit.nodeId;
          if (
            runtimeState.nodeErrors.has(nodeIdentifier) ||
            runtimeState.skippedNodes.has(nodeIdentifier)
          ) {
            continue; // Skip nodes that were already marked as failed.
          }

          runtimeState = await step.do(
            `run node ${nodeIdentifier}`,
            Runtime.defaultStepConfig,
            async () =>
              this.executeNode(
                runtimeState,
                workflow.id,
                nodeIdentifier,
                organizationId,
                instanceId,
                secrets,
                httpRequest,
                emailMessage
              )
          );
        } else if (executionUnit.type === "inline") {
          // Execute inline group - all nodes in a single step
          const groupDescription = `inline group [${executionUnit.nodeIds.join(", ")}]`;

          runtimeState = await step.do(
            `run ${groupDescription}`,
            Runtime.defaultStepConfig,
            async () =>
              this.executeInlineGroup(
                runtimeState,
                workflow.id,
                executionUnit.nodeIds,
                organizationId,
                instanceId,
                secrets,
                httpRequest,
                emailMessage
              )
          );
        }

        // Persist progress after each execution unit if monitoring is enabled
        if (monitorProgress) {
          const unitDescription =
            executionUnit.type === "individual"
              ? executionUnit.nodeId
              : `inline group [${executionUnit.nodeIds.join(", ")}]`;

          executionRecord = await step.do(
            `persist after ${unitDescription}`,
            Runtime.defaultStepConfig,
            async () =>
              this.saveExecutionState(
                userId,
                organizationId,
                workflow.id,
                instanceId,
                runtimeState,
                executionRecord.startedAt,
                executionRecord.endedAt
              )
          );
        }
      }
    } catch (error) {
      // Capture unexpected failure.
      runtimeState = { ...runtimeState, status: "error" };
      executionRecord = {
        ...executionRecord,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Set endedAt timestamp when execution finishes (success or error)
      executionRecord.endedAt = new Date();
      // Always persist the final state
      executionRecord = await step.do(
        "persist final execution record",
        Runtime.defaultStepConfig,
        async () => {
          // Skip credit usage tracking in development mode
          if (this.env.CLOUDFLARE_ENV !== "development") {
            await updateOrganizationComputeUsage(
              this.env.KV,
              organizationId,
              // Update organization compute credits for executed nodes
              this.getNodesComputeCost(
                runtimeState.workflow.nodes.filter((node) =>
                  runtimeState.executedNodes.has(node.id)
                )
              )
            );
          }
          return this.saveExecutionState(
            userId,
            organizationId,
            workflow.id,
            instanceId,
            runtimeState,
            executionRecord.startedAt,
            executionRecord.endedAt
          );
        }
      );
    }

    return executionRecord;
  }

  /**
   * Checks if the organization has enough compute credits to execute a workflow.
   * Credit limits are not enforced in development mode.
   */
  private async hasEnoughComputeCredits(
    organizationId: string,
    computeCredits: number,
    computeCost: number
  ): Promise<boolean> {
    // Skip credit limit enforcement in development mode
    if (this.env.CLOUDFLARE_ENV === "development") {
      return true;
    }

    const computeUsage = await getOrganizationComputeUsage(
      this.env.KV,
      organizationId
    );
    return computeUsage + computeCost <= computeCredits;
  }

  /**
   * Returns the compute cost of a list of nodes.
   */
  private getNodesComputeCost(nodes: Node[]): number {
    return nodes.reduce((acc, node) => {
      const nodeType = this.nodeRegistry.getNodeType(node.type);
      return acc + (nodeType.computeCost ?? 1);
    }, 0);
  }

  /**
   * Preloads all organization secrets for synchronous access during workflow execution
   */
  private async preloadAllSecrets(organizationId: string): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {};
    const db = createDatabase(this.env.DB);
    
    try {
      // Get all secret records for the organization (including encrypted values)
      const secretRecords = await getAllSecretsWithValues(db, organizationId);
      
      // Decrypt each secret and add to the secrets object
      for (const secretRecord of secretRecords) {
        try {
          const secretValue = await this.decryptSecretValue(
            secretRecord.encryptedValue,
            organizationId
          );
          secrets[secretRecord.name] = secretValue;
        } catch (error) {
          console.warn(`Failed to decrypt secret '${secretRecord.name}':`, error);
        }
      }
      
      console.log(`Preloaded ${Object.keys(secrets).length} secrets for organization ${organizationId}`);
    } catch (error) {
      console.error(`Failed to preload secrets for organization ${organizationId}:`, error);
    }

    return secrets;
  }

  /**
   * Decrypt a secret value using organization-specific key
   */
  private async decryptSecretValue(
    encryptedValue: string,
    organizationId: string
  ): Promise<string> {
    // Import decryptSecret here to avoid circular dependency issues
    const { decryptSecret } = await import("../utils/encryption");
    return await decryptSecret(encryptedValue, this.env, organizationId);
  }

  /**
   * Validates the workflow and creates a sequential execution order with inline groups.
   */
  private async initialiseWorkflow(workflow: Workflow): Promise<RuntimeState> {
    const validationErrors = validateWorkflow(workflow);
    if (validationErrors.length > 0) {
      throw new NonRetryableError(
        `Workflow validation failed: ${validationErrors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    const orderedNodes = this.createTopologicalOrder(workflow);
    if (orderedNodes.length === 0 && workflow.nodes.length > 0) {
      throw new NonRetryableError(
        "Unable to derive execution order. The graph may contain a cycle."
      );
    }

    // Create execution plan with inline groups
    const executionPlan = this.createExecutionPlan(workflow, orderedNodes);

    return {
      workflow,
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      executionPlan,
      status: "executing",
    };
  }

  /**
   * Creates an execution plan that groups consecutive inlinable nodes together.
   * Enhanced version that can handle branching patterns within groups.
   *
   * Examples of patterns that can now be inlined:
   *
   * Fan-out pattern:
   *   A → B
   *   A → C     [A, B, C] can be grouped together
   *
   * Fan-in pattern:
   *   A → C
   *   B → C     [A, B, C] can be grouped together
   *
   * Tree pattern:
   *   A → B → D
   *   A → C → D  [A, B, C, D] can be grouped together
   *
   * The old linear approach would have executed these as separate steps,
   * but now they execute in a single Cloudflare workflow step.
   */
  private createExecutionPlan(
    workflow: Workflow,
    orderedNodes: string[]
  ): ExecutionPlan {
    const plan: ExecutionPlan = [];
    const processedNodes = new Set<string>();
    let totalInlineGroups = 0;
    let totalInlinedNodes = 0;

    for (let i = 0; i < orderedNodes.length; i++) {
      const nodeId = orderedNodes[i];

      if (processedNodes.has(nodeId)) {
        continue; // Already processed in a group
      }

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const nodeType = this.nodeRegistry.getNodeType(node.type);
      const isInlinable = nodeType.inlinable ?? false;

      if (isInlinable) {
        // Look ahead to find a group of connected inlinable nodes
        const inlineGroup = this.findConnectedInlinableGroup(
          workflow,
          nodeId,
          orderedNodes,
          i,
          processedNodes
        );

        if (inlineGroup.length === 1) {
          // Single node - add as individual
          plan.push({ type: "individual", nodeId: inlineGroup[0] });
        } else {
          // Multiple nodes - add as inline group
          plan.push({ type: "inline", nodeIds: [...inlineGroup] });
          totalInlineGroups++;
          totalInlinedNodes += inlineGroup.length;
        }

        // Mark all nodes in the group as processed
        inlineGroup.forEach((id) => processedNodes.add(id));
      } else {
        // Non-inlinable node - add as individual
        plan.push({ type: "individual", nodeId });
        processedNodes.add(nodeId);
      }
    }

    // Log metrics for performance analysis
    if (totalInlineGroups > 0) {
      const totalInlinableNodes = orderedNodes.filter((nodeId) => {
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return false;
        const nodeType = this.nodeRegistry.getNodeType(node.type);
        return nodeType.inlinable ?? false;
      }).length;

      const inliningEfficiency =
        (totalInlinedNodes / totalInlinableNodes) * 100;
      console.log(
        `Execution plan optimized: ${totalInlineGroups} inline groups containing ${totalInlinedNodes}/${totalInlinableNodes} inlinable nodes (${inliningEfficiency.toFixed(1)}% efficiency)`
      );

      // Log individual group sizes for analysis
      const groupSizes = plan
        .filter((unit) => unit.type === "inline")
        .map((unit) => (unit.type === "inline" ? unit.nodeIds.length : 0));

      console.log(`Group sizes: [${groupSizes.join(", ")}]`);
    }

    return plan;
  }

  /**
   * Finds a connected group of inlinable nodes starting from a given node.
   * Uses a simple algorithm: expand the group as long as all dependencies are satisfied.
   */
  private findConnectedInlinableGroup(
    workflow: Workflow,
    startNodeId: string,
    orderedNodes: string[],
    startIndex: number,
    alreadyProcessed: Set<string>
  ): string[] {
    const group = [startNodeId];
    const groupSet = new Set([startNodeId]);

    // Look ahead in the topological order for nodes that can be added to this group
    for (let i = startIndex + 1; i < orderedNodes.length; i++) {
      const candidateId = orderedNodes[i];

      // Skip if already processed or not inlinable
      if (alreadyProcessed.has(candidateId)) continue;

      const candidateNode = workflow.nodes.find((n) => n.id === candidateId);
      if (!candidateNode) continue;

      const candidateNodeType = this.nodeRegistry.getNodeType(
        candidateNode.type
      );
      if (!(candidateNodeType.inlinable ?? false)) continue;

      // Check if this candidate can be safely added to the group
      if (
        this.canSafelyAddToGroup(
          workflow,
          candidateId,
          groupSet,
          orderedNodes,
          startIndex
        )
      ) {
        group.push(candidateId);
        groupSet.add(candidateId);
      }
    }

    return group;
  }

  /**
   * Simplified check: a node can be added to a group if all its dependencies
   * are either already executed or in the current group.
   */
  private canSafelyAddToGroup(
    workflow: Workflow,
    nodeId: string,
    currentGroupSet: Set<string>,
    orderedNodes: string[],
    groupStartIndex: number
  ): boolean {
    // Get all dependencies of this node
    const dependencies = workflow.edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);

    // Check each dependency
    for (const depId of dependencies) {
      const isInGroup = currentGroupSet.has(depId);
      const depIndex = orderedNodes.indexOf(depId);
      const isAlreadyExecuted = depIndex < groupStartIndex;

      if (!isInGroup && !isAlreadyExecuted) {
        return false; // Has unmet dependency
      }
    }

    return true;
  }

  /**
   * Executes a group of inlinable nodes sequentially in a single step.
   */
  private async executeInlineGroup(
    runtimeState: RuntimeState,
    workflowId: string,
    nodeIds: string[],
    organizationId: string,
    executionId: string,
    secrets: Record<string, string>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): Promise<RuntimeState> {
    let currentState = runtimeState;
    const groupStartTime = Date.now();
    const executedNodesInGroup: string[] = [];

    console.log(`Starting inline group execution: [${nodeIds.join(", ")}]`);

    // Execute each node in the group sequentially
    for (const nodeId of nodeIds) {
      // Skip nodes that were already marked as failed or skipped
      if (
        currentState.nodeErrors.has(nodeId) ||
        currentState.skippedNodes.has(nodeId)
      ) {
        console.log(
          `Skipping node ${nodeId} in inline group (already failed/skipped)`
        );
        continue;
      }

      try {
        const nodeStartTime = Date.now();

        currentState = await this.executeNode(
          currentState,
          workflowId,
          nodeId,
          organizationId,
          executionId,
          secrets,
          httpRequest,
          emailMessage
        );

        const nodeExecutionTime = Date.now() - nodeStartTime;

        // If execution failed, break the inline group execution
        if (currentState.nodeErrors.has(nodeId)) {
          console.log(
            `Node ${nodeId} failed in inline group after ${nodeExecutionTime}ms, stopping group execution`
          );
          break;
        }

        executedNodesInGroup.push(nodeId);
        console.log(
          `Node ${nodeId} completed in inline group (${nodeExecutionTime}ms)`
        );
      } catch (error) {
        // Handle errors at the group level
        const message = error instanceof Error ? error.message : String(error);
        currentState.nodeErrors.set(nodeId, message);
        currentState.status = "error";
        console.log(
          `Fatal error in node ${nodeId} within inline group: ${message}`
        );
        break;
      }
    }

    const totalGroupTime = Date.now() - groupStartTime;
    console.log(
      `Inline group completed: executed ${executedNodesInGroup.length}/${nodeIds.length} nodes in ${totalGroupTime}ms`
    );

    return currentState;
  }

  /**
   * Executes a single node and stores its outputs.
   */
  private async executeNode(
    runtimeState: RuntimeState,
    workflowId: string,
    nodeIdentifier: string,
    organizationId: string,
    executionId: string,
    secrets: Record<string, string>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): Promise<RuntimeState> {
    const node = runtimeState.workflow.nodes.find(
      (n): boolean => n.id === nodeIdentifier
    );
    if (!node) {
      runtimeState.nodeErrors.set(
        nodeIdentifier,
        `Node not found: ${nodeIdentifier}`
      );
      return { ...runtimeState, status: "error" };
    }

    const nodeType = this.nodeRegistry.getNodeType(node.type);
    this.env.COMPUTE.writeDataPoint({
      indexes: [organizationId],
      blobs: [organizationId, workflowId, node.id],
      doubles: [nodeType.computeCost ?? 1],
    });

    // Resolve the runnable implementation.
    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      runtimeState.nodeErrors.set(
        nodeIdentifier,
        `Node type not implemented: ${node.type}`
      );
      return { ...runtimeState, status: "error" };
    }

    // Gather inputs by reading connections and default values.
    const inputValues = this.collectNodeInputs(runtimeState, nodeIdentifier);

    try {
      const processedInputs = await this.mapRuntimeToNodeInputs(
        runtimeState,
        nodeIdentifier,
        inputValues
      );

      // Configure AI Gateway options for all AI model requests
      // If CLOUDFLARE_AI_GATEWAY_ID is set, all AI requests will be routed through the gateway
      // for analytics, caching, and rate limiting. If not set, requests go directly to the model.
      const aiOptions: AiOptions = {};
      const gatewayId = this.env.CLOUDFLARE_AI_GATEWAY_ID;
      if (gatewayId) {
        aiOptions.gateway = {
          id: gatewayId,
          skipCache: false, // Enable caching by default for better performance
        };
      }

      const context: NodeContext = {
        nodeId: nodeIdentifier,
        workflowId: runtimeState.workflow.id,
        organizationId,
        inputs: processedInputs,
        httpRequest,
        emailMessage,
        onProgress: () => {},
        toolRegistry: this.toolRegistry,
        secrets: secrets || {},
        env: {
          DB: this.env.DB,
          AI: this.env.AI,
          AI_OPTIONS: aiOptions,
          RESSOURCES: this.env.RESSOURCES,
          DATASETS: this.env.DATASETS,
          DATASETS_AUTORAG: this.env.DATASETS_AUTORAG,
          CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
          CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
          CLOUDFLARE_AI_GATEWAY_ID: this.env.CLOUDFLARE_AI_GATEWAY_ID,
          TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
          TWILIO_PHONE_NUMBER: this.env.TWILIO_PHONE_NUMBER,
          SENDGRID_API_KEY: this.env.SENDGRID_API_KEY,
          SENDGRID_DEFAULT_FROM: this.env.SENDGRID_DEFAULT_FROM,
          RESEND_API_KEY: this.env.RESEND_API_KEY,
          RESEND_DEFAULT_FROM: this.env.RESEND_DEFAULT_FROM,
          AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
          AWS_REGION: this.env.AWS_REGION,
          SES_DEFAULT_FROM: this.env.SES_DEFAULT_FROM,
          EMAIL_DOMAIN: this.env.EMAIL_DOMAIN,
          OPENAI_API_KEY: this.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
          GEMINI_API_KEY: this.env.GEMINI_API_KEY,
        },
      };

      const result = await executable.execute(context);

      if (result.status === "completed") {
        const outputsForRuntime = await this.mapNodeToRuntimeOutputs(
          runtimeState,
          nodeIdentifier,
          result.outputs ?? {},
          organizationId,
          executionId
        );
        runtimeState.nodeOutputs.set(
          nodeIdentifier,
          outputsForRuntime as NodeOutputs
        );
        runtimeState.executedNodes.add(nodeIdentifier);

        // After successful execution, mark nodes connected to inactive outputs as skipped
        runtimeState = this.markInactiveOutputNodesAsSkipped(
          runtimeState,
          nodeIdentifier,
          result.outputs ?? {}
        );
      } else {
        const failureMessage = result.error ?? "Unknown error";
        runtimeState.nodeErrors.set(nodeIdentifier, failureMessage);
        runtimeState.status = "error";
      }

      // Determine final workflow status.
      if (runtimeState.status !== "error") {
        const allNodesVisited = runtimeState.executionPlan.every((unit) =>
          unit.type === "individual"
            ? runtimeState.executedNodes.has(unit.nodeId) ||
              runtimeState.skippedNodes.has(unit.nodeId) ||
              runtimeState.nodeErrors.has(unit.nodeId)
            : unit.type === "inline"
              ? unit.nodeIds.every(
                  (id: string) =>
                    runtimeState.executedNodes.has(id) ||
                    runtimeState.skippedNodes.has(id) ||
                    runtimeState.nodeErrors.has(id)
                )
              : false
        );
        runtimeState.status =
          allNodesVisited && runtimeState.nodeErrors.size === 0
            ? "completed"
            : "executing";
      }

      return runtimeState;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Required input")
      ) {
        runtimeState.skippedNodes.add(nodeIdentifier);

        // Determine final workflow status.
        if (runtimeState.status !== "error") {
          const allNodesVisited = runtimeState.executionPlan.every((unit) =>
            unit.type === "individual"
              ? runtimeState.executedNodes.has(unit.nodeId) ||
                runtimeState.skippedNodes.has(unit.nodeId) ||
                runtimeState.nodeErrors.has(unit.nodeId)
              : unit.type === "inline"
                ? unit.nodeIds.every(
                    (id: string) =>
                      runtimeState.executedNodes.has(id) ||
                      runtimeState.skippedNodes.has(id) ||
                      runtimeState.nodeErrors.has(id)
                  )
                : false
          );
          runtimeState.status =
            allNodesVisited && runtimeState.nodeErrors.size === 0
              ? "completed"
              : "executing";
        }
        return runtimeState;
      }
      const message = error instanceof Error ? error.message : String(error);
      runtimeState.nodeErrors.set(nodeIdentifier, message);
      runtimeState.status = "error";
      return runtimeState;
    }
  }

  /**
   * Returns inputs for a node by checking its default values and inbound edges.
   */
  private collectNodeInputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string
  ): NodeOutputs {
    const inputs: NodeOutputs = {};
    const node = runtimeState.workflow.nodes.find(
      (n): boolean => n.id === nodeIdentifier
    );
    if (!node) return inputs;

    // Defaults declared directly on the node.
    for (const input of node.inputs) {
      if (input.value !== undefined) {
        if (
          typeof input.value === "string" ||
          typeof input.value === "number" ||
          typeof input.value === "boolean" ||
          (typeof input.value === "object" && input.value !== null)
        ) {
          inputs[input.name] = input.value as NodeOutputValue;
        }
      }
    }

    // Values coming from connected nodes.
    const inboundEdges = runtimeState.workflow.edges.filter(
      (edge): boolean => edge.target === nodeIdentifier
    );

    // Group edges by target input to handle multiple connections
    const edgesByInput = new Map<string, typeof inboundEdges>();
    for (const edge of inboundEdges) {
      const inputName = edge.targetInput;
      if (!edgesByInput.has(inputName)) {
        edgesByInput.set(inputName, []);
      }
      edgesByInput.get(inputName)!.push(edge);
    }

    // Process each input's connections
    for (const [inputName, edges] of edgesByInput) {
      // Get the node type definition to check repeated
      const executable = this.nodeRegistry.createExecutableNode(node);
      const nodeTypeDefinition = executable
        ? (executable.constructor as any).nodeType
        : null;
      const nodeTypeInput = nodeTypeDefinition?.inputs?.find(
        (input: any) => input.name === inputName
      );

      // Check repeated from node type definition (not workflow node)
      const acceptsMultiple = nodeTypeInput?.repeated || false;

      const values: BasicNodeOutputValue[] = [];

      for (const edge of edges) {
        const sourceOutputs = runtimeState.nodeOutputs.get(edge.source);
        if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
          const value = sourceOutputs[edge.sourceOutput];
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            (typeof value === "object" && value !== null)
          ) {
            values.push(value as BasicNodeOutputValue);
          }
        }
      }

      if (values.length > 0) {
        if (acceptsMultiple) {
          // For parameters that accept multiple connections, provide an array
          inputs[inputName] = values;
        } else {
          // For single connection parameters, use the last value (current behavior)
          inputs[inputName] = values[values.length - 1];
        }
      }
    }

    return inputs;
  }

  /**
   * Converts raw runtime inputs to the representation expected by the node.
   */
  private async mapRuntimeToNodeInputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    inputValues: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};
    const objectStore = new ObjectStore(this.env.RESSOURCES);

    for (const definition of node.inputs) {
      const { name, type, required } = definition;
      const value = inputValues[name];

      if (required && value === undefined) {
        throw new Error(
          `Required input '${name}' missing for node ${nodeIdentifier}`
        );
      }
      if (value === undefined || value === null) continue;

      // Check if this parameter accepts multiple connections
      const executable = this.nodeRegistry.createExecutableNode(node);
      const nodeTypeDefinition = executable
        ? (executable.constructor as any).nodeType
        : null;
      const nodeTypeInput = nodeTypeDefinition?.inputs?.find(
        (input: any) => input.name === name
      );
      const acceptsMultiple = nodeTypeInput?.repeated || false;

      // Handle secret parameters as strings since secrets are preloaded in context
      const parameterType = type === "secret" ? "string" : type;

      if (acceptsMultiple && Array.isArray(value)) {
        // For parameters that accept multiple connections, process each value individually
        const processedArray = [];
        for (const singleValue of value) {
          const validSingleValue = singleValue as
            | string
            | number
            | boolean
            | ObjectReference
            | JsonArray
            | JsonObject;
          const processedSingleValue = await apiToNodeParameter(
            parameterType,
            validSingleValue,
            objectStore
          );
          processedArray.push(processedSingleValue);
        }
        processed[name] = processedArray;
      } else {
        // Single value processing (existing logic)
        const validValue = value as
          | string
          | number
          | boolean
          | ObjectReference
          | JsonArray
          | JsonObject;
        const processedValue = await apiToNodeParameter(
          parameterType,
          validValue,
          objectStore
        );
        processed[name] = processedValue;
      }
    }

    return processed;
  }

  /**
   * Converts node outputs to a serialisable runtime representation.
   */
  private async mapNodeToRuntimeOutputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    outputsFromNode: Record<string, unknown>,
    organizationId: string,
    executionId: string
  ): Promise<Record<string, unknown>> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};
    const objectStore = new ObjectStore(this.env.RESSOURCES);

    for (const definition of node.outputs) {
      const { name, type } = definition;
      const value = outputsFromNode[name];
      if (value === undefined || value === null) continue;

      // Handle secret parameters as strings since secrets are preloaded in context
      const parameterType = type === "secret" ? "string" : type;

      processed[name] = await nodeToApiParameter(
        parameterType,
        value,
        objectStore,
        organizationId,
        executionId
      );
    }
    return processed;
  }

  /**
   * Calculates a topological ordering of nodes. Returns an empty array if a cycle is detected.
   */
  private createTopologicalOrder(workflow: Workflow): string[] {
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};

    for (const node of workflow.nodes) {
      inDegree[node.id] = 0;
      adjacency[node.id] = [];
    }

    for (const edge of workflow.edges) {
      adjacency[edge.source].push(edge.target);
      inDegree[edge.target] += 1;
    }

    const queue: string[] = Object.keys(inDegree).filter(
      (id) => inDegree[id] === 0
    );
    const ordered: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      ordered.push(current);

      for (const neighbour of adjacency[current]) {
        inDegree[neighbour] -= 1;
        if (inDegree[neighbour] === 0) {
          queue.push(neighbour);
        }
      }
    }

    // If ordering missed nodes, a cycle exists.
    return ordered.length === workflow.nodes.length ? ordered : [];
  }

  /**
   * Persists the workflow execution state to the database.
   */
  private async saveExecutionState(
    userId: string,
    organizationId: string,
    workflowId: string,
    instanceId: string,
    runtimeState: RuntimeState,
    startedAt?: Date,
    endedAt?: Date
  ): Promise<WorkflowExecution> {
    // Build node execution list with explicit status for each node.
    const nodeExecutionList = runtimeState.workflow.nodes.map((node) => {
      if (runtimeState.executedNodes.has(node.id)) {
        return {
          nodeId: node.id,
          status: "completed" as NodeExecutionStatus,
          outputs: runtimeState.nodeOutputs.get(node.id),
        };
      }
      if (runtimeState.nodeErrors.has(node.id)) {
        return {
          nodeId: node.id,
          status: "error" as NodeExecutionStatus,
          error: runtimeState.nodeErrors.get(node.id),
        };
      }
      if (runtimeState.skippedNodes.has(node.id)) {
        return {
          nodeId: node.id,
          status: "skipped" as NodeExecutionStatus,
        };
      }
      return {
        nodeId: node.id,
        status: "executing" as NodeExecutionStatus,
      };
    });

    const executionStatus = runtimeState.status;
    const errorMsg =
      runtimeState.nodeErrors.size > 0
        ? Array.from(runtimeState.nodeErrors.values()).join(", ")
        : undefined;

    try {
      const db = createDatabase(this.env.DB);
      return await saveExecution(db, {
        id: instanceId,
        workflowId,
        userId,
        organizationId,
        status: executionStatus as ExecutionStatusType,
        nodeExecutions: nodeExecutionList,
        error: errorMsg,
        visibility: "private",
        updatedAt: new Date(),
        startedAt,
        endedAt,
      });
    } catch (error) {
      console.error("Failed to persist execution record:", error);
      // Continue without interrupting the workflow.
    }

    return {
      id: instanceId,
      workflowId,
      status: executionStatus,
      nodeExecutions: nodeExecutionList,
      error: errorMsg,
      visibility: "private",
      startedAt,
      endedAt,
    };
  }

  /**
   * Marks nodes connected to inactive outputs as skipped.
   * This is crucial for conditional logic where only one branch should execute.
   */
  private markInactiveOutputNodesAsSkipped(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    nodeOutputs: Record<string, unknown>
  ): RuntimeState {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) return runtimeState;

    // Find outputs that were NOT produced
    const inactiveOutputs = node.outputs
      .map((output) => output.name)
      .filter((outputName) => !(outputName in nodeOutputs));

    if (inactiveOutputs.length === 0) return runtimeState;

    // Find all edges from this node's inactive outputs
    const inactiveEdges = runtimeState.workflow.edges.filter(
      (edge) =>
        edge.source === nodeIdentifier &&
        inactiveOutputs.includes(edge.sourceOutput)
    );

    // Process each target node of inactive edges
    for (const edge of inactiveEdges) {
      this.markNodeAsSkippedIfNoValidInputs(runtimeState, edge.target);
    }

    return runtimeState;
  }

  /**
   * Marks a node as skipped if it cannot execute due to missing required inputs.
   * This is smarter than recursively skipping all dependents.
   */
  private markNodeAsSkippedIfNoValidInputs(
    runtimeState: RuntimeState,
    nodeId: string
  ): void {
    if (
      runtimeState.skippedNodes.has(nodeId) ||
      runtimeState.executedNodes.has(nodeId)
    ) {
      return; // Already processed
    }

    const node = runtimeState.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Check if this node has all required inputs satisfied
    const allRequiredInputsSatisfied = this.nodeHasAllRequiredInputsSatisfied(
      runtimeState,
      nodeId
    );

    // Only skip if the node cannot execute (missing required inputs)
    if (!allRequiredInputsSatisfied) {
      runtimeState.skippedNodes.add(nodeId);

      // Recursively check dependents of this skipped node
      const outgoingEdges = runtimeState.workflow.edges.filter(
        (edge) => edge.source === nodeId
      );

      for (const edge of outgoingEdges) {
        this.markNodeAsSkippedIfNoValidInputs(runtimeState, edge.target);
      }
    }
  }

  /**
   * Checks if a node has all required inputs satisfied.
   * A node can execute if all its required inputs are available.
   */
  private nodeHasAllRequiredInputsSatisfied(
    runtimeState: RuntimeState,
    nodeId: string
  ): boolean {
    const node = runtimeState.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    // Get the node type definition to check for required inputs
    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) return false;

    const nodeTypeDefinition = (executable.constructor as any).nodeType;
    if (!nodeTypeDefinition) return false;

    const inputValues = this.collectNodeInputs(runtimeState, nodeId);

    // Check each required input based on the node type definition (not workflow node definition)
    for (const input of nodeTypeDefinition.inputs) {
      if (input.required && inputValues[input.name] === undefined) {
        return false; // Found a required input that's missing
      }
    }

    return true; // All required inputs are satisfied
  }
}
