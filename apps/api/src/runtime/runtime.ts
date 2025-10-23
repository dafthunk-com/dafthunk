import {
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
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { HttpRequest, NodeContext } from "../nodes/types";
import { EmailMessage } from "../nodes/types";
import { updateOrganizationComputeUsage } from "../utils/credits";
import { validateWorkflow } from "../utils/workflows";
import { SkipHandler } from "./skip-handler";
import { CreditManager } from "./credit-manager";
import { ErrorHandler } from "./error-handler";
import { ExecutionMonitoring } from "./execution-monitoring";
import { ExecutionPersistence } from "./execution-persistence";
import { ExecutionPlanner } from "./execution-planner";
import { InputCollector } from "./input-collector";
import { InputTransformer } from "./input-transformer";
import { IntegrationManager } from "./integration-manager";
import { NodeExecutor } from "./node-executor";
import { OutputTransformer } from "./output-transformer";
import { SecretManager } from "./secret-manager";
import type {
  ExecutionPlan,
  ExecutionState,
  IntegrationData,
  WorkflowExecutionContext,
} from "./types";

export interface RuntimeParams {
  workflow: Workflow;
  userId: string;
  organizationId: string;
  computeCredits: number;
  workflowSessionId?: string;
  deploymentId?: string;
  httpRequest?: HttpRequest;
  emailMessage?: EmailMessage;
}

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
  private planner: ExecutionPlanner;
  private inputCollector: InputCollector;
  private inputTransformer: InputTransformer;
  private outputTransformer: OutputTransformer;
  private secretManager: SecretManager;
  private integrationManager: IntegrationManager;
  private creditManager: CreditManager;
  private skipHandler: SkipHandler;
  private persistence: ExecutionPersistence;
  private monitoring: ExecutionMonitoring;
  private executor: NodeExecutor;
  private errorHandler: ErrorHandler;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.nodeRegistry = new CloudflareNodeRegistry(env, true);
    this.toolRegistry = new CloudflareToolRegistry(
      this.nodeRegistry,
      this.createNodeContextForTool.bind(this)
    );

    // Initialize specialized components
    this.planner = new ExecutionPlanner(this.nodeRegistry);
    this.inputCollector = new InputCollector(this.nodeRegistry);
    this.inputTransformer = new InputTransformer(this.nodeRegistry);
    this.outputTransformer = new OutputTransformer();
    this.secretManager = new SecretManager(env);
    this.integrationManager = new IntegrationManager(env);
    this.creditManager = new CreditManager(env, this.nodeRegistry);
    this.skipHandler = new SkipHandler(
      this.nodeRegistry,
      this.inputCollector
    );
    this.errorHandler = new ErrorHandler();
    this.persistence = new ExecutionPersistence(env, this.errorHandler);
    // Monitoring is initialized per execution with sessionId
    this.monitoring = new ExecutionMonitoring(env);
    this.executor = new NodeExecutor(
      env,
      this.nodeRegistry,
      this.toolRegistry,
      this.inputCollector,
      this.inputTransformer,
      this.outputTransformer,
      this.skipHandler,
      this.integrationManager,
      this.errorHandler
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
      // Tool executions don't have access to organization secrets/integrations
      getSecret: async (secretName: string) => {
        throw new Error(
          `Secret access not available in tool execution context. Secret '${secretName}' cannot be accessed.`
        );
      },
      getIntegration: async (integrationId: string) => {
        throw new Error(
          `Integration access not available in tool execution context. Integration '${integrationId}' cannot be accessed.`
        );
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
  }

  /**
   * The main entrypoint called by the Workflows engine.
   *
   * Error handling strategy:
   * - Workflow-level errors (validation, cycles) → throw NonRetryableError
   * - Node execution failures → stored in nodeErrors, workflow continues
   * - Exceptions during node execution → caught, workflow status set to "error"
   * - All errors transmitted to client via sendExecutionUpdateToSession callbacks
   */
  async run(event: WorkflowEvent<RuntimeParams>, step: WorkflowStep) {
    const {
      workflow,
      userId,
      organizationId,
      workflowSessionId,
      httpRequest,
      emailMessage,
      computeCredits,
    } = event.payload;
    const instanceId = event.instanceId;

    // Initialize monitoring with session ID for this execution
    this.monitoring = new ExecutionMonitoring(this.env, workflowSessionId);

    // Initialise state and execution records.
    let executionState: ExecutionState = {
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      status: "submitted",
    };

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: event.payload.workflow.id,
      deploymentId: event.payload.deploymentId,
      status: "submitted",
      nodeExecutions: [],
      startedAt: undefined,
      endedAt: undefined,
    } as WorkflowExecution;

    if (
      !(await this.creditManager.hasEnoughComputeCredits(
        organizationId,
        computeCredits,
        this.creditManager.getNodesComputeCost(workflow.nodes)
      ))
    ) {
      executionState = { ...executionState, status: "exhausted" };
      return await step.do(
        "persist exhausted execution state",
        Runtime.defaultStepConfig,
        async () =>
          this.persistence.saveExecutionState(
            userId,
            organizationId,
            workflow,
            instanceId,
            executionState,
            new Date(),
            new Date()
          )
      );
    }

    // Declare context outside try block so it's available in finally
    let executionContext: WorkflowExecutionContext | undefined;

    try {
      // Preload all organization secrets for synchronous access
      const secrets = await step.do(
        "preload organization secrets",
        Runtime.defaultStepConfig,
        async () => this.secretManager.preloadAllSecrets(organizationId)
      );

      // Preload all organization integrations for synchronous access
      // @ts-expect-error - Cloudflare Workflows Serializable<T> wrapper incompatibility
      const integrations: Record<string, IntegrationData> = await step.do(
        "preload organization integrations",
        Runtime.defaultStepConfig,
        // @ts-expect-error - Cloudflare Workflows Serializable type incompatibility
        async () => this.integrationManager.preloadAllIntegrations(organizationId)
      );

      // Prepare workflow (validation + ordering).
      // @ts-expect-error - TS2589: Type instantiation depth limitation with Cloudflare Workflows step.do
      const { context, state } = await step.do(
        "initialise workflow",
        Runtime.defaultStepConfig,
        () =>
          this.initialiseWorkflow(
            workflow,
            workflow.id,
            organizationId,
            instanceId
          )
      );

      executionContext = context;
      executionState = state;
      executionRecord.startedAt = new Date();

      // Execute nodes sequentially.
      for (const executionUnit of executionContext.executionPlan) {
        if (executionUnit.type === "individual") {
          const nodeIdentifier = executionUnit.nodeId;
          if (
            this.errorHandler.shouldSkipNode(executionState, nodeIdentifier)
          ) {
            continue; // Skip nodes that were already marked as failed.
          }

          executionState = await step.do(
            `run node ${nodeIdentifier}`,
            Runtime.defaultStepConfig,
            async () =>
              this.executor.executeNode(
                executionContext!,
                executionState,
                nodeIdentifier,
                secrets,
                integrations,
                httpRequest,
                emailMessage
              )
          );
        } else if (executionUnit.type === "inline") {
          // Execute inline group - all nodes in a single step
          const groupDescription = `inline group [${executionUnit.nodeIds.join(", ")}]`;

          executionState = await step.do(
            `run ${groupDescription}`,
            Runtime.defaultStepConfig,
            async () =>
              this.executor.executeInlineGroup(
                executionContext!,
                executionState,
                executionUnit.nodeIds,
                secrets,
                integrations,
                httpRequest,
                emailMessage
              )
          );
        }

        // Send progress update
        executionRecord = {
          ...executionRecord,
          status: executionState.status,
          nodeExecutions: this.persistence.buildNodeExecutions(
            executionContext.workflow,
            executionState
          ),
        };

        await this.monitoring.sendUpdate(executionRecord);
      }
    } catch (error) {
      // Capture unexpected failure.
      executionState = { ...executionState, status: "error" };
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
              this.creditManager.getNodesComputeCost(
                workflow.nodes.filter((node) =>
                  executionState.executedNodes.has(node.id)
                )
              )
            );
          }
          return this.persistence.saveExecutionState(
            userId,
            organizationId,
            workflow,
            instanceId,
            executionState,
            executionRecord.startedAt,
            executionRecord.endedAt
          );
        }
      );

      // Send final update
      await this.monitoring.sendUpdate(executionRecord);
    }

    return executionRecord;
  }

  /**
   * Validates the workflow and creates a sequential execution order with inline groups.
   * Returns separated immutable context and mutable state.
   */
  private async initialiseWorkflow(
    workflow: Workflow,
    workflowId: string,
    organizationId: string,
    executionId: string
  ): Promise<{ context: WorkflowExecutionContext; state: ExecutionState }> {
    const validationErrors = validateWorkflow(workflow);
    if (validationErrors.length > 0) {
      throw new NonRetryableError(
        `Workflow validation failed: ${validationErrors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    const orderedNodes = this.planner.createTopologicalOrder(workflow);
    if (orderedNodes.length === 0 && workflow.nodes.length > 0) {
      throw new NonRetryableError(
        "Unable to derive execution order. The graph may contain a cycle."
      );
    }

    // Create execution plan with inline groups
    const executionPlan = this.planner.createExecutionPlan(
      workflow,
      orderedNodes
    );

    // Immutable context
    const context: WorkflowExecutionContext = {
      workflow,
      executionPlan,
      workflowId,
      organizationId,
      executionId,
    };

    // Mutable state
    const state: ExecutionState = {
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      status: "executing",
    };

    return { context, state };
  }
}
