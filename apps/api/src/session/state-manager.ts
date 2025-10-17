/**
 * StateManager
 *
 * Manages workflow state loading, persistence, and recovery.
 *
 * Storage Strategy:
 * - DO Storage: Recovery data (workflowId, userId) for hibernation
 * - D1 Database: Workflow metadata (name, type, timestamps)
 * - R2 Storage: Full workflow data (nodes, edges, configuration)
 *
 * Persistence:
 * - Updates are debounced (default 500ms) to avoid excessive writes
 * - Data is written to both D1 (metadata) and R2 (full data) on persist
 * - Recovery data is stored in DO storage for hibernation recovery
 */

import type { WorkflowState } from "@dafthunk/types";

import type { Bindings } from "../context";
import { WorkflowStore } from "../runtime/workflow-store";

interface StateManagerOptions {
  env: Bindings;
  storage: DurableObjectStorage;
  persistDebounceMs?: number;
}

export class StateManager {
  private readonly env: Bindings;
  private readonly storage: DurableObjectStorage;
  private readonly persistDebounceMs: number;

  private state: WorkflowState | null = null;
  private organizationId: string | null = null;
  private userId: string | null = null;
  private pendingPersistTimeout: number | undefined = undefined;

  constructor(options: StateManagerOptions) {
    this.env = options.env;
    this.storage = options.storage;
    this.persistDebounceMs = options.persistDebounceMs ?? 500;
  }

  /**
   * Load workflow from storage with user access verification
   *
   * Steps:
   * 1. Verify user has access (via D1 metadata query)
   * 2. Load full workflow data from R2 (with fallback)
   * 3. Initialize in-memory state
   */
  async loadState(workflowId: string, userId: string): Promise<void> {
    const workflowStore = new WorkflowStore(this.env.DB, this.env.RESSOURCES);
    const result = await workflowStore.getWithUserAccess(workflowId, userId);

    if (!result) {
      throw new Error(
        `User ${userId} does not have access to workflow ${workflowId}`
      );
    }

    const { workflow, organizationId } = result;

    // Try to load full data from R2, fall back to empty structure if fails
    const workflowWithData = await workflowStore.getWithData(
      workflowId,
      organizationId
    );
    const workflowData = workflowWithData?.data || {
      id: workflowId,
      name: workflow.name,
      handle: workflow.handle,
      type: workflow.type,
      nodes: [],
      edges: [],
    };

    this.state = {
      id: workflowId,
      name: workflowData.name,
      handle: workflowData.handle,
      type: workflowData.type as WorkflowState["type"],
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      timestamp: workflow.updatedAt?.getTime() || Date.now(),
    };

    this.organizationId = organizationId;
    this.userId = userId;
  }

  /**
   * Ensure state is initialized, recovering from DO storage if needed
   *
   * Recovery occurs after Durable Object hibernation when in-memory state
   * is lost but WebSocket connections persist.
   */
  async ensureInitialized(): Promise<void> {
    if (this.state) {
      return;
    }

    const [workflowId, userId] = await Promise.all([
      this.storage.get<string>("workflowId"),
      this.storage.get<string>("userId"),
    ]);

    if (!workflowId || !userId) {
      throw new Error("Session state lost. Please refresh the page.");
    }

    await this.loadState(workflowId, userId);
  }

  /**
   * Get current state
   */
  getState(): WorkflowState {
    if (!this.state) {
      throw new Error("Workflow not loaded");
    }
    return this.state;
  }

  /**
   * Update workflow state with validation
   */
  updateState(state: WorkflowState): void {
    if (!this.state) {
      throw new Error("Workflow not loaded");
    }

    // Validate incoming state matches current state
    if (state.id !== this.state.id) {
      throw new Error(
        `Workflow ID mismatch: expected ${this.state.id}, got ${state.id}`
      );
    }

    // Validate required fields
    if (!state.name || !state.handle || !state.type) {
      throw new Error(
        "Invalid state: missing required fields (name, handle, or type)"
      );
    }

    // Validate arrays are present
    if (!Array.isArray(state.nodes) || !Array.isArray(state.edges)) {
      throw new Error("Invalid state: nodes and edges must be arrays");
    }

    this.state = state;
    this.schedulePersist();
  }

  /**
   * Schedule a debounced persist
   */
  private schedulePersist(): void {
    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
    }

    this.pendingPersistTimeout = setTimeout(() => {
      this.persistToDatabase();
      this.pendingPersistTimeout = undefined;
    }, this.persistDebounceMs) as unknown as number;
  }

  /**
   * Persist state to storage (D1 metadata and R2 full data)
   */
  private async persistToDatabase(): Promise<void> {
    if (!this.state || !this.organizationId) {
      return;
    }

    try {
      const workflowStore = new WorkflowStore(this.env.DB, this.env.RESSOURCES);

      const workflowData = {
        id: this.state.id,
        name: this.state.name,
        handle: this.state.handle,
        type: this.state.type,
        nodes: this.state.nodes,
        edges: this.state.edges,
      };

      // Save to both R2 and D1
      await Promise.all([
        // Persist metadata updates
        workflowStore.update(this.state.id, this.organizationId, {
          name: this.state.name,
          type: this.state.type,
        } as any),
        // Save full data to R2 via store save()
        workflowStore.save(workflowData as any),
      ]);
    } catch (error) {
      console.error("Error persisting workflow:", error);
    }
  }

  /**
   * Flush any pending persist operation
   */
  async flushPersist(): Promise<void> {
    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
      await this.persistToDatabase();
      this.pendingPersistTimeout = undefined;
    }
  }

  /**
   * Store workflow ID and user ID in DO storage for recovery
   */
  async storeRecoveryData(): Promise<void> {
    if (this.state && this.userId) {
      await Promise.all([
        this.storage.put("workflowId", this.state.id),
        this.storage.put("userId", this.userId),
      ]);
    }
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  getUserId(): string | null {
    return this.userId;
  }
}
