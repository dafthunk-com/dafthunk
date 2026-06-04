/**
 * Gets the organization's total usage.
 */
export async function getOrganizationComputeUsage(
  KV: KVNamespace,
  organizationId: string
): Promise<number> {
  const usageKey = getUsageKey(organizationId);
  const currentUsage = parseInt((await KV.get(usageKey)) ?? "0");
  return currentUsage;
}

/**
 * Updates the organization's total usage.
 */
export async function updateOrganizationComputeUsage(
  KV: KVNamespace,
  organizationId: string,
  usage: number
): Promise<void> {
  const usageKey = getUsageKey(organizationId);
  const currentUsage = parseInt((await KV.get(usageKey)) ?? "0");
  await KV.put(usageKey, (currentUsage + usage).toString());
}

/**
 * Resets the organization's compute usage to zero.
 * Called when a Pro user's billing period resets.
 */
export async function resetOrganizationComputeUsage(
  KV: KVNamespace,
  organizationId: string
): Promise<void> {
  const usageKey = getUsageKey(organizationId);
  await KV.put(usageKey, "0");
}

function getUsageKey(organizationId: string): string {
  return `${organizationId}:compute-usage`;
}

export function creditChecksEnabled(cloudflareEnv?: string): boolean {
  return cloudflareEnv !== "development";
}

export function isCreditExhausted(
  billingInfo: { creditsExhausted: boolean; unlimitedUsage: boolean },
  cloudflareEnv?: string
): boolean {
  if (!creditChecksEnabled(cloudflareEnv)) return false;
  if (billingInfo.unlimitedUsage) return false;
  return billingInfo.creditsExhausted;
}

/**
 * Drizzle `.set()` fragment that clears the exhausted cache. Use at every
 * site that restores availability so the invalidation surface stays
 * greppable.
 */
export function clearCreditsExhausted(): {
  creditsExhausted: false;
  updatedAt: Date;
} {
  return { creditsExhausted: false, updatedAt: new Date() };
}
