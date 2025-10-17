import type { Bindings } from "../context";
import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import type { HttpRequest, NodeContext } from "../nodes/types";
import type { EmailMessage } from "../nodes/types";
import { ObjectStore } from "../stores/object-store";
import type { ConditionalExecutionHandler } from "./conditional-execution-handler";
import type { IntegrationManager } from "./integration-manager";
import type { NodeInputMapper } from "./node-input-mapper";
import type { NodeOutputMapper } from "./node-output-mapper";
import type { NodeOutputs, RuntimeState } from "./runtime";

/**
 * Executes workflow nodes.
 * Handles both individual nodes and groups of inlinable nodes.
 */
export class NodeExecutor {
  constructor(
    private env: Bindings,
    private nodeRegistry: CloudflareNodeRegistry,
    private toolRegistry: CloudflareToolRegistry,
    private inputMapper: NodeInputMapper,
    private outputMapper: NodeOutputMapper,
    private conditionalHandler: ConditionalExecutionHandler,
    private integrationManager: IntegrationManager
  ) {}

  /**
   * Executes a group of inlinable nodes sequentially in a single step.
   */
  async executeInlineGroup(
    runtimeState: RuntimeState,
    workflowId: string,
    nodeIds: string[],
    organizationId: string,
    executionId: string,
    secrets: Record<string, string>,
    integrations: Record<string, any>,
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
          integrations,
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
  async executeNode(
    runtimeState: RuntimeState,
    workflowId: string,
    nodeIdentifier: string,
    organizationId: string,
    executionId: string,
    secrets: Record<string, string>,
    integrations: Record<string, any>,
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
    const inputValues = this.inputMapper.collectNodeInputs(
      runtimeState,
      nodeIdentifier
    );

    try {
      const objectStore = new ObjectStore(this.env.RESSOURCES);
      const processedInputs = await this.inputMapper.mapRuntimeToNodeInputs(
        runtimeState,
        nodeIdentifier,
        inputValues,
        objectStore
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
        integrations: integrations || {},
        integrationManager: this.integrationManager,
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
          HUGGINGFACE_API_KEY: this.env.HUGGINGFACE_API_KEY,
        },
      };

      const result = await executable.execute(context);

      if (result.status === "completed") {
        const outputsForRuntime =
          await this.outputMapper.mapNodeToRuntimeOutputs(
            runtimeState,
            nodeIdentifier,
            result.outputs ?? {},
            objectStore,
            organizationId,
            executionId
          );
        runtimeState.nodeOutputs.set(
          nodeIdentifier,
          outputsForRuntime as NodeOutputs
        );
        runtimeState.executedNodes.add(nodeIdentifier);

        // After successful execution, mark nodes connected to inactive outputs as skipped
        runtimeState = this.conditionalHandler.markInactiveOutputNodesAsSkipped(
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
}
