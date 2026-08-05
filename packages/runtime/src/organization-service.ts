/**
 * Who the workflow belongs to.
 *
 * Exists so a node can address "the people who own this workflow" without
 * being handed an address to hardcode. A literal recipient is wrong twice
 * over: it is stale the moment the team changes, and it lets a generated
 * workflow carry someone's personal address into a graph that gets shared.
 *
 * Resolved at run time and scoped by `organizationId`, like every other
 * service on the node context.
 */
export interface OrganizationService {
  /**
   * Email addresses of everyone in the organization, deduplicated.
   *
   * Empty when nobody has a usable address, which callers must treat as "do
   * not send" rather than "send to nobody" — silently succeeding at sending
   * zero emails is how a notification workflow looks healthy for a month.
   */
  memberEmails(organizationId: string): Promise<string[]>;
}
