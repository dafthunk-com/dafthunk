import type { BaseNodeRegistry } from "./base-node-registry";
import type { BaseToolRegistry } from "./base-tool-registry";
import type { CredentialService } from "./credential-service";
import type { CreditService } from "./credit-service";
import type { DatabaseService } from "./database-service";
import type { DatasetService } from "./dataset-service";
import type { ExecutionStore } from "./execution-store";
import type { MailboxService } from "./mailbox-service";
import type { MonitoringService } from "./monitoring-service";
import type { ObjectStore } from "./object-store";
import type { QueueService } from "./queue-service";
import type { SchemaService } from "./schema-service";
import type { CodeModeExecutor } from "./utils/code-mode";
import type { SandboxExecutor } from "./utils/sandbox-mode";

/**
 * Collaborators a Runtime needs. Concrete wiring happens in the consuming app's
 * factory functions (e.g. createWorkflowRuntime(), createWorkerRuntime()).
 *
 * The required entries are those the engine itself calls on every run. The
 * optional ones are capabilities the host may not offer; nodes that need one
 * check for it and report a clear error when it is absent.
 */
export interface RuntimeDependencies<Env = unknown> {
  nodeRegistry: BaseNodeRegistry<Env>;
  credentialProvider: CredentialService;
  executionStore: ExecutionStore;
  monitoringService: MonitoringService;
  creditService: CreditService;
  objectStore: ObjectStore;
  toolRegistry?: BaseToolRegistry;
  databaseService?: DatabaseService;
  datasetService?: DatasetService;
  queueService?: QueueService;
  schemaService?: SchemaService;
  mailboxService?: MailboxService;
  /** Sandboxed JavaScript executor (Cloudflare Dynamic Workers in production). */
  codeModeExecutor?: CodeModeExecutor;
  /** Multi-language sandbox executor (Cloudflare Containers in production). */
  sandboxExecutor?: SandboxExecutor;
  runtimeVersion?: string;
}
