import type { Deployment, Workflow as WorkflowType } from "@dafthunk/types";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { Bindings } from "../context";
import type { DeploymentInsert, DeploymentRow } from "../db";
import { createDatabase, Database } from "../db";
import { deployments, organizations, workflows } from "../db";
import { getOrganizationCondition, getWorkflowCondition } from "../db/queries";

/**
 * Manages deployment metadata in D1 and workflow snapshots in R2.
 */
export class DeploymentStore {
  private db: Database;

  constructor(private env: Bindings) {
    this.db = createDatabase(env.DB);
  }

  /** Create a deployment metadata record */
  async create(newDeployment: DeploymentInsert): Promise<DeploymentRow> {
    await this.db.insert(deployments).values(newDeployment);

    const [deployment] = await this.db
      .select()
      .from(deployments)
      .where(eq(deployments.id, newDeployment.id));

    return deployment;
  }

  /** Get a deployment by id with org scoping */
  async get(
    id: string,
    organizationIdOrHandle: string
  ): Promise<DeploymentRow | undefined> {
    const [resultRow] = await this.db
      .select({ deployments: deployments })
      .from(deployments)
      .innerJoin(
        organizations,
        eq(deployments.organizationId, organizations.id)
      )
      .where(
        and(
          eq(deployments.id, id),
          getOrganizationCondition(organizationIdOrHandle)
        )
      );
    return resultRow?.deployments;
  }

  /** Get latest deployment for a workflow */
  async getLatest(
    workflowIdOrHandle: string,
    organizationIdOrHandle: string
  ): Promise<DeploymentRow | undefined> {
    const [firstResult] = await this.db
      .select()
      .from(deployments)
      .innerJoin(
        workflows,
        and(
          eq(deployments.workflowId, workflows.id),
          getWorkflowCondition(workflowIdOrHandle)
        )
      )
      .innerJoin(
        organizations,
        and(
          eq(workflows.organizationId, organizations.id),
          getOrganizationCondition(organizationIdOrHandle)
        )
      )
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    return firstResult?.deployments;
  }

  /** Get deployment for workflow at specific version */
  async getByVersion(
    workflowIdOrHandle: string,
    organizationIdOrHandle: string,
    version: string
  ): Promise<DeploymentRow | undefined> {
    const [firstResult] = await this.db
      .select({ deployments: deployments })
      .from(deployments)
      .innerJoin(workflows, eq(deployments.workflowId, workflows.id))
      .innerJoin(organizations, eq(workflows.organizationId, organizations.id))
      .where(
        and(
          eq(deployments.version, parseInt(version, 10)),
          getWorkflowCondition(workflowIdOrHandle),
          getOrganizationCondition(organizationIdOrHandle)
        )
      )
      .limit(1);

    return firstResult?.deployments;
  }

  /** List deployments by workflow */
  async listByWorkflow(
    workflowId: string,
    organizationIdOrHandle: string
  ): Promise<DeploymentRow[]> {
    const results = await this.db
      .select({ deployments: deployments })
      .from(deployments)
      .innerJoin(
        organizations,
        eq(deployments.organizationId, organizations.id)
      )
      .where(
        and(
          eq(deployments.workflowId, workflowId),
          getOrganizationCondition(organizationIdOrHandle)
        )
      )
      .orderBy(desc(deployments.createdAt));

    return results.map((item) => item.deployments);
  }

  /** Latest version number for a workflow deployments */
  async getLatestVersionNumber(
    workflowId: string,
    organizationIdOrHandle: string
  ): Promise<number | null> {
    const [resultRow] = await this.db
      .select({
        maxVersion: sql<number>`MAX(${deployments.version})`.mapWith(Number),
      })
      .from(deployments)
      .innerJoin(
        organizations,
        eq(deployments.organizationId, organizations.id)
      )
      .where(
        and(
          eq(deployments.workflowId, workflowId),
          getOrganizationCondition(organizationIdOrHandle)
        )
      );

    return resultRow?.maxVersion ?? null;
  }

  /** Grouped deployments by workflow */
  async getGroupedByWorkflow(
    organizationIdOrHandle: string
  ): Promise<Deployment[]> {
    const workflowDeploymentAggregates = this.db
      .$with("workflow_deployment_aggregates")
      .as(
        this.db
          .select({
            workflowId: deployments.workflowId,
            maxVersion: sql<number>`MAX(${deployments.version})`
              .mapWith(Number)
              .as("max_version"),
            deploymentCount: sql<number>`COUNT(${deployments.id})`
              .mapWith(Number)
              .as("deployment_count"),
          })
          .from(deployments)
          .innerJoin(
            organizations,
            and(
              eq(deployments.organizationId, organizations.id),
              getOrganizationCondition(organizationIdOrHandle)
            )
          )
          .groupBy(deployments.workflowId)
      );

    const actualLatestDeployment = alias(
      deployments,
      "actual_latest_deployment"
    );

    const results = await this.db
      .with(workflowDeploymentAggregates)
      .select({
        workflowId: workflows.id,
        workflowName: workflows.name,
        workflowType: workflows.type,
        latestDeploymentId: actualLatestDeployment.id,
        latestVersion: (workflowDeploymentAggregates as any).maxVersion,
        deploymentCount: (workflowDeploymentAggregates as any).deploymentCount,
        latestCreatedAt: actualLatestDeployment.createdAt,
      })
      .from(workflows)
      .innerJoin(
        workflowDeploymentAggregates,
        eq(workflows.id, (workflowDeploymentAggregates as any).workflowId)
      )
      .innerJoin(
        actualLatestDeployment,
        and(
          eq(
            actualLatestDeployment.workflowId,
            (workflowDeploymentAggregates as any).workflowId
          ),
          eq(
            actualLatestDeployment.version,
            (workflowDeploymentAggregates as any).maxVersion
          )
        )
      )
      .innerJoin(
        organizations,
        and(
          eq(workflows.organizationId, organizations.id),
          getOrganizationCondition(organizationIdOrHandle)
        )
      )
      .orderBy(desc(actualLatestDeployment.createdAt));

    return results.map((row) => ({
      workflowId: row.workflowId,
      workflowName: row.workflowName,
      workflowType: row.workflowType,
      latestDeploymentId: row.latestDeploymentId,
      latestVersion: row.latestVersion as number,
      deploymentCount: row.deploymentCount as number,
      latestCreatedAt: row.latestCreatedAt,
    }));
  }

  /** Write workflow snapshot JSON for a deployment to R2 */
  async writeWorkflowSnapshot(
    deploymentId: string,
    workflow: WorkflowType
  ): Promise<void> {
    const key = `deployments/${deploymentId}/workflow.json`;
    const result = await this.env.RESSOURCES.put(
      key,
      JSON.stringify(workflow),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "public, max-age=31536000",
        },
        customMetadata: {
          deploymentId,
          workflowId: (workflow as any).id,
          createdAt: new Date().toISOString(),
        },
      }
    );
    if (!result) {
      throw new Error("Failed to write deployment snapshot to R2");
    }
  }

  /** Read workflow snapshot by deployment id */
  async readWorkflowSnapshot(deploymentId: string): Promise<WorkflowType> {
    const key = `deployments/${deploymentId}/workflow.json`;
    const object = await this.env.RESSOURCES.get(key);
    if (!object) {
      throw new Error(`Workflow not found for deployment: ${deploymentId}`);
    }
    const text = await object.text();
    return JSON.parse(text) as WorkflowType;
  }

  /** Delete workflow snapshot by deployment id */
  async deleteWorkflowSnapshot(deploymentId: string): Promise<void> {
    const key = `deployments/${deploymentId}/workflow.json`;
    await this.env.RESSOURCES.delete(key);
  }

  /** Fetch deployment metadata and attach workflow snapshot */
  async getWithData(
    deploymentId: string,
    organizationIdOrHandle: string
  ): Promise<(DeploymentRow & { workflowData: WorkflowType }) | undefined> {
    const deployment = await this.get(deploymentId, organizationIdOrHandle);
    if (!deployment) return undefined;
    const workflowData = await this.readWorkflowSnapshot(deployment.id);
    return { ...deployment, workflowData };
  }
}
