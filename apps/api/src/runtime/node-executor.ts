import type { Bindings } from "../context";
import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import type { HttpRequest, NodeContext } from "../nodes/types";
import type { EmailMessage } from "../nodes/types";
import { ObjectStore } from "../stores/object-store";
import type { ConditionalExecutionHandler } from "./conditional-execution-handler";
import type { ErrorHandler } from "./error-handler";
import { NodeNotFoundError, NodeTypeNotImplementedError } from "./error-types";
import type { InputCollector } from "./input-collector";
import type { InputTransformer } from "./input-transformer";
import type { IntegrationManager } from "./integration-manager";
import type { OutputTransformer } from "./output-transformer";
import type {
  ExecutionState,
  NodeRuntimeValues,
  WorkflowExecutionContext,
} from "./types";

/**
 * Executes workflow nodes.
 * Handles both individual nodes and groups of inlinable nodes.
 */
export class NodeExecutor {
  constructor(
    private env: Bindings,
    private nodeRegistry: CloudflareNodeRegistry,
    private toolRegistry: CloudflareToolRegistry,
    private inputCollector: InputCollector,
    private inputTransformer: InputTransformer,
    private outputTransformer: OutputTransformer,
    private conditionalHandler: ConditionalExecutionHandler,
    private integrationManager: IntegrationManager,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * Executes a group of inlinable nodes sequentially in a single step.
   */
  async executeInlineGroup(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeIds: string[],
    secrets: Record<string, string>,
    integrations: Record<string, any>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): Promise<ExecutionState> {
    let currentState = state;
    const groupStartTime = Date.now();
    const executedNodesInGroup: string[] = [];

    console.log(`Starting inline group execution: [${nodeIds.join(", ")}]`);

    // Execute each node in the group sequentially
    for (const nodeId of nodeIds) {
      // Skip nodes that were already marked as failed or skipped
      if (this.errorHandler.shouldSkipNode(currentState, nodeId)) {
        console.log(
          `Skipping node ${nodeId} in inline group (already failed/skipped)`
        );
        continue;
      }

      try {
        const nodeStartTime = Date.now();

        currentState = await this.executeNode(
          context,
          currentState,
          nodeId,
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
        currentState = this.errorHandler.recordNodeError(
          currentState,
          nodeId,
          error instanceof Error ? error : new Error(String(error))
        );
        const message = error instanceof Error ? error.message : String(error);
        console.log(`Error in node ${nodeId} within inline group: ${message}`);
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
   *
   * Error handling modes:
   * 1. Node returns status: "failed" → error stored in nodeErrors, execution continues
   * 2. Node throws exception → execution stops, workflow status set to "error"
   */
  async executeNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeIdentifier: string,
    secrets: Record<string, string>,
    integrations: Record<string, any>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): Promise<ExecutionState> {
    const node = context.workflow.nodes.find(
      (n): boolean => n.id === nodeIdentifier
    );
    if (!node) {
      const error = new NodeNotFoundError(nodeIdentifier);
      state = this.errorHandler.recordNodeError(state, nodeIdentifier, error);
      state = this.errorHandler.updateStatus(context, state);
      return state;
    }

    const nodeType = this.nodeRegistry.getNodeType(node.type);
    this.env.COMPUTE.writeDataPoint({
      indexes: [context.organizationId],
      blobs: [context.organizationId, context.workflowId, node.id],
      doubles: [nodeType.computeCost ?? 1],
    });

    // Resolve the runnable implementation.
    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      const error = new NodeTypeNotImplementedError(nodeIdentifier, node.type);
      state = this.errorHandler.recordNodeError(state, nodeIdentifier, error);
      state = this.errorHandler.updateStatus(context, state);
      return state;
    }

    // Gather inputs by reading connections and default values.
    const inputValues = this.inputCollector.collectNodeInputs(
      context.workflow,
      state.nodeOutputs,
      nodeIdentifier
    );

    try {
      const objectStore = new ObjectStore(this.env.RESSOURCES);
      const processedInputs = await this.inputTransformer.transformInputs(
        context.workflow,
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

      const nodeContext: NodeContext = {
        nodeId: nodeIdentifier,
        workflowId: context.workflowId,
        organizationId: context.organizationId,
        inputs: processedInputs,
        httpRequest,
        emailMessage,
        onProgress: () => {},
        toolRegistry: this.toolRegistry,
        // Callback-based access to secrets (lazy, secure)
        getSecret: async (secretName: string) => {
          return secrets?.[secretName];
        },
        // Callback-based access to integrations (lazy, auto-refreshing)
        getIntegration: async (integrationId: string) => {
          const integration = integrations?.[integrationId];
          if (!integration) {
            throw new Error(
              `Integration '${integrationId}' not found or access denied. Please check your integration settings.`
            );
          }

          // Automatically refresh token if needed
          const token =
            await this.integrationManager.getValidAccessToken(integrationId);

          return {
            id: integration.id,
            name: integration.name,
            provider: integration.provider,
            token,
            metadata: integration.metadata,
          };
        },
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

      const result = await executable.execute(nodeContext);

      if (result.status === "completed") {
        const outputsForRuntime = await this.outputTransformer.transformOutputs(
          context.workflow,
          nodeIdentifier,
          result.outputs ?? {},
          objectStore,
          context.organizationId,
          context.executionId
        );
        state.nodeOutputs.set(
          nodeIdentifier,
          outputsForRuntime as NodeRuntimeValues
        );
        state.executedNodes.add(nodeIdentifier);

        // After successful execution, mark nodes connected to inactive outputs as skipped
        state = this.conditionalHandler.markInactiveOutputNodesAsSkipped(
          context,
          state,
          nodeIdentifier,
          result.outputs ?? {}
        );
      } else {
        // Node returned status="failed" - store error and continue execution
        const failureMessage = result.error ?? "Unknown error";
        state = this.errorHandler.recordNodeError(
          state,
          nodeIdentifier,
          failureMessage
        );
      }

      // Update workflow status based on current state
      state = this.errorHandler.updateStatus(context, state);

      return state;
    } catch (error) {
      // Record the error
      state = this.errorHandler.recordNodeError(
        state,
        nodeIdentifier,
        error instanceof Error ? error : new Error(String(error))
      );

      // Update workflow status
      state = this.errorHandler.updateStatus(context, state);

      return state;
    }
  }
}
