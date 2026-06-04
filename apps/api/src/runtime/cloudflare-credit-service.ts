import type {
  CreditCheckParams,
  CreditService,
  SettleAvailabilityParams,
} from "@dafthunk/runtime";
import { isUsageExhausted } from "@dafthunk/runtime";
import { and, eq } from "drizzle-orm";

import { createDatabase } from "../db";
import { organizations } from "../db/schema";
import {
  getOrganizationComputeUsage,
  updateOrganizationComputeUsage,
} from "../utils/credits";

export type { CreditCheckParams, CreditService, SettleAvailabilityParams };

/**
 * Cumulative usage lives in KV; `settleAvailability` flips the
 * `credits_exhausted` cache on `organizations` so trigger paths can
 * short-circuit with one indexed read.
 */
export class CloudflareCreditService implements CreditService {
  constructor(
    private readonly kv: KVNamespace,
    private readonly db: ReturnType<typeof createDatabase>,
    private readonly isDevelopment: boolean = false
  ) {}

  async hasEnoughCredits(params: CreditCheckParams): Promise<boolean> {
    if (this.isDevelopment) return true;
    if (params.unlimitedUsage) return true;

    const currentUsage = await getOrganizationComputeUsage(
      this.kv,
      params.organizationId
    );
    return !isUsageExhausted(currentUsage, params, params.estimatedUsage);
  }

  async recordUsage(organizationId: string, usage: number): Promise<void> {
    if (this.isDevelopment || usage <= 0) return;
    await updateOrganizationComputeUsage(this.kv, organizationId, usage);
  }

  async settleAvailability(params: SettleAvailabilityParams): Promise<void> {
    if (this.isDevelopment || params.unlimitedUsage) return;

    // KV is eventually consistent; we accept a narrow staleness window.
    const currentUsage = await getOrganizationComputeUsage(
      this.kv,
      params.organizationId
    );
    if (!isUsageExhausted(currentUsage, params, 1)) return;

    // Idempotent: the `creditsExhausted = false` predicate skips the write
    // once the flag is set, avoiding contention with concurrent webhooks.
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
