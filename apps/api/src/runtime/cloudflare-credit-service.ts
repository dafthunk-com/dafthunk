import type { CreditParams, CreditService } from "@dafthunk/runtime";
import { isUsageExhausted } from "@dafthunk/runtime";
import { and, eq } from "drizzle-orm";

import { createDatabase } from "../db";
import { organizations } from "../db/schema";
import {
  getOrganizationComputeUsage,
  updateOrganizationComputeUsage,
} from "../utils/credits";

export type { CreditParams, CreditService };

export class CloudflareCreditService implements CreditService {
  constructor(
    private readonly kv: KVNamespace,
    private readonly db: ReturnType<typeof createDatabase>,
    private readonly isDevelopment: boolean = false
  ) {}

  async hasEnoughCredits(params: CreditParams): Promise<boolean> {
    if (this.isDevelopment) return true;
    if (params.unlimitedUsage) return true;

    const currentUsage = await getOrganizationComputeUsage(
      this.kv,
      params.organizationId
    );
    return !isUsageExhausted(currentUsage, params);
  }

  async recordUsage(organizationId: string, usage: number): Promise<void> {
    if (this.isDevelopment || usage <= 0) return;
    await updateOrganizationComputeUsage(this.kv, organizationId, usage);
  }

  async settleAvailability(params: CreditParams): Promise<void> {
    if (this.isDevelopment || params.unlimitedUsage) return;

    const currentUsage = await getOrganizationComputeUsage(
      this.kv,
      params.organizationId
    );
    if (!isUsageExhausted(currentUsage, params)) return;

    // Predicate makes the write idempotent under concurrent webhooks.
    await this.db
      .update(organizations)
      .set({ creditsExhausted: true, updatedAt: new Date() })
      .where(
        and(
          eq(organizations.id, params.organizationId),
          eq(organizations.creditsExhausted, false)
        )
      );
  }
}
