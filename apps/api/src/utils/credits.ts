/**
 * Gets the organization's total compute usage.
 */
export async function getOrganizationComputeUsage(
  KV: KVNamespace,
  organizationId: string
): Promise<number> {
  const usageKey = getComputeUsageKey(organizationId);
  const computeUsage = parseInt((await KV.get(usageKey)) ?? "0");
  return computeUsage;
}

/**
 * Updates the organization's total compute usage.
 */
export async function updateOrganizationComputeUsage(
  KV: KVNamespace,
  organizationId: string,
  computeCost: number
): Promise<void> {
  const usageKey = getComputeUsageKey(organizationId);
  const computeUsage = parseInt((await KV.get(usageKey)) ?? "0");

  await KV.put(usageKey, (computeUsage + computeCost).toString());
}

/**
 * Gets the compute usage key for an organization for the current month.
 * Format: {organizationId}:compute-usage:{YYYY-MM}
 */
function getComputeUsageKey(organizationId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${organizationId}:compute-usage:${year}-${month}`;
}
