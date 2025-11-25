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
 * Gets the usage key for an organization.
 * Format: {organizationId}:compute-usage
 */
function getUsageKey(organizationId: string): string {
  return `${organizationId}:compute-usage`;
}
