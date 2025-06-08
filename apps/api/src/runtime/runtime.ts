import {
  JsonArray,
  JsonObject,
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
import { createDatabase, ExecutionStatusType, saveExecution } from "../db";
import { NodeRegistry } from "../nodes/node-registry";
import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../nodes/parameter-mapper";
import { HttpRequest, NodeContext } from "../nodes/types";
import { EmailMessage } from "../nodes/types";
import { validateWorkflow } from "../utils/workflows";
import { ObjectStore } from "./object-store";

// Node output value type
export type NodeOutputValue =
  | string
  | number
  | boolean
  | ObjectReference
  | JsonArray
  | JsonObject;

export type NodeOutputs = Record<string, NodeOutputValue>;
export type NodeErrors = Map<string, string>;
export type WorkflowOutputs = Map<string, NodeOutputs>;
export type ExecutedNodeSet = Set<string>;
export type SortedNodeList = string[];

export type RuntimeParams = {
  workflow: Workflow;
  userId: string;
  organizationId: string;
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
  sortedNodes: SortedNodeList;
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

  /**
   * The main entrypoint called by the Workflows engine.
   */
  async run(event: WorkflowEvent<RuntimeParams>, step: WorkflowStep) {
    NodeRegistry.initialize(this.env);

    const {
      workflow,
      userId,
      organizationId,
      monitorProgress = false,
      httpRequest,
      emailMessage,
    } = event.payload;
    const instanceId = event.instanceId;

    // Initialise state and execution records.
    let runtimeState: RuntimeState = {
      workflow,
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      sortedNodes: [],
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

    try {
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
      for (const nodeIdentifier of runtimeState.sortedNodes) {
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
              nodeIdentifier,
              organizationId,
              instanceId,
              httpRequest,
              emailMessage
            )
        );

        // Persist progress after each node if monitoring is enabled
        if (monitorProgress) {
          executionRecord = await step.do(
            `persist after ${nodeIdentifier}`,
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

    return executionRecord;
  }

  /**
   * Validates the workflow and creates a sequential execution order.
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

    return {
      workflow,
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      sortedNodes: orderedNodes,
      status: "executing",
    };
  }

  /**
   * Executes a single node and stores its outputs.
   */
  private async executeNode(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    organizationId: string,
    executionId: string,
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

    // Resolve the runnable implementation.
    const executable = NodeRegistry.getInstance().createExecutableNode(node);
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

      const context: NodeContext = {
        nodeId: nodeIdentifier,
        workflowId: runtimeState.workflow.id,
        inputs: processedInputs,
        httpRequest,
        emailMessage,
        // No progress feedback in this implementation.
        onProgress: () => {},
        env: {
          AI: this.env.AI,
          CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
          CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
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
        const allNodesVisited = runtimeState.sortedNodes.every(
          (id: string) =>
            runtimeState.executedNodes.has(id) ||
            runtimeState.skippedNodes.has(id) ||
            runtimeState.nodeErrors.has(id)
        );
        runtimeState.status =
          allNodesVisited && runtimeState.nodeErrors.size === 0
            ? "completed"
            : "executing";
      }

      return runtimeState;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Required input")) {
        runtimeState.skippedNodes.add(nodeIdentifier);

        // Determine final workflow status.
        if (runtimeState.status !== "error") {
          const allNodesVisited = runtimeState.sortedNodes.every(
            (id: string) =>
              runtimeState.executedNodes.has(id) ||
              runtimeState.skippedNodes.has(id) ||
              runtimeState.nodeErrors.has(id)
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

    for (const edge of inboundEdges) {
      const sourceOutputs = runtimeState.nodeOutputs.get(edge.source);
      if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
        const value = sourceOutputs[edge.sourceOutput];
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          (typeof value === "object" && value !== null)
        ) {
          inputs[edge.targetInput] = value as NodeOutputValue;
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
    const objectStore = new ObjectStore(this.env.BUCKET);

    for (const definition of node.inputs) {
      const { name, type, required } = definition;
      const value = inputValues[name];

      if (required && value === undefined) {
        throw new Error(
          `Required input '${name}' missing for node ${nodeIdentifier}`
        );
      }
      if (value === undefined || value === null) continue;

      // Ensure we're passing a valid ApiParameterValue type as defined in packages/types
      const validValue = value as
        | string
        | number
        | boolean
        | ObjectReference
        | JsonArray
        | JsonObject;

      processed[name] = await apiToNodeParameter(type, validValue, objectStore);
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
    const objectStore = new ObjectStore(this.env.BUCKET);

    for (const definition of node.outputs) {
      const { name, type } = definition;
      const value = outputsFromNode[name];
      if (value === undefined || value === null) continue;

      processed[name] = await nodeToApiParameter(
        type,
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
    if (runtimeState.skippedNodes.has(nodeId) || runtimeState.executedNodes.has(nodeId)) {
      return; // Already processed
    }

    const node = runtimeState.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Check if this node has all required inputs satisfied
    const allRequiredInputsSatisfied = this.nodeHasAllRequiredInputsSatisfied(runtimeState, nodeId);

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
    const executable = NodeRegistry.getInstance().createExecutableNode(node);
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
