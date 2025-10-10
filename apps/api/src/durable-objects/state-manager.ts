/**
 * StateManager
 *
 * Manages workflow state loading, persistence, and recovery.
 * Handles debounced writes to D1 and R2 storage.
 */

import type { WorkflowState } from "@dafthunk/types";

import type { Bindings } from "../context";
import { createDatabase, updateWorkflow } from "../db/index";
import { getWorkflowWithUserAccess } from "../db/queries";
import { ObjectStore } from "../runtime/object-store";

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
   * Load workflow from D1 database (metadata) and R2 (full data) with user access verification
   */
  async loadState(workflowId: string, userId: string): Promise<void> {
    console.log(`Loading workflow ${workflowId} for user ${userId}`);
    const db = createDatabase(this.env.DB);
    const result = await getWorkflowWithUserAccess(db, workflowId, userId);

    if (!result) {
      throw new Error(
        `User ${userId} does not have access to workflow ${workflowId}`
      );
    }

    const { workflow, organizationId } = result;

    // Load full workflow data from R2
    const objectStore = new ObjectStore(this.env.RESSOURCES);
    let workflowData;
    try {
      workflowData = await objectStore.readWorkflow(workflowId);
    } catch (error) {
      console.error(
        `Failed to load workflow data from R2 for ${workflowId}:`,
        error
      );
      // Fall back to empty workflow structure
      workflowData = {
        id: workflowId,
        name: workflow.name,
        handle: workflow.handle,
        type: workflow.type,
        nodes: [],
        edges: [],
      };
    }

    this.state = {
      id: workflowId,
      name: workflowData.name,
      handle: workflowData.handle,
      type: workflowData.type,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      timestamp: workflow?.updatedAt?.getTime() || Date.now(),
    };

    this.organizationId = organizationId;
    this.userId = userId;
  }

  /**
   * Ensure state is initialized, recovering from DO storage if needed
   */
  async ensureInitialized(): Promise<void> {
    if (this.state) {
      return;
    }

    const storedWorkflowId = await this.storage.get<string>("workflowId");
    const storedUserId = await this.storage.get<string>("userId");

    if (!storedWorkflowId || !storedUserId) {
      throw new Error("Session state lost. Please refresh the page.");
    }

    try {
      await this.loadState(storedWorkflowId, storedUserId);
      console.log(`Recovered state for workflow ${storedWorkflowId}`);
    } catch (error) {
      console.error("Failed to recover state from storage:", error);
      throw new Error("Session state lost. Please refresh the page.");
    }
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
   * Persist state to D1 database (metadata) and R2 (full data)
   */
  private async persistToDatabase(): Promise<void> {
    if (!this.state || !this.organizationId) {
      return;
    }

    try {
      const db = createDatabase(this.env.DB);
      const objectStore = new ObjectStore(this.env.RESSOURCES);

      // Save full workflow data to R2
      const workflowData = {
        id: this.state.id,
        name: this.state.name,
        handle: this.state.handle,
        type: this.state.type,
        nodes: this.state.nodes,
        edges: this.state.edges,
      };

      await objectStore.writeWorkflow(workflowData);

      // Save metadata to D1 database
      await updateWorkflow(db, this.state.id, this.organizationId, {
        name: this.state.name,
        type: this.state.type,
      });

      console.log(`Persisted workflow ${this.state.id} to D1 database and R2`);
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
      await this.storage.put("workflowId", this.state.id);
      await this.storage.put("userId", this.userId);
    }
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  getUserId(): string | null {
    return this.userId;
  }
}
