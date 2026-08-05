import type { OrganizationService } from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { createDatabase } from "../db";
import { getOrganizationMembershipsWithUsers } from "../db/queries";

/** D1-backed `OrganizationService`. */
export class CloudflareOrganizationService implements OrganizationService {
  constructor(private readonly env: Bindings) {}

  async memberEmails(organizationId: string): Promise<string[]> {
    const memberships = await getOrganizationMembershipsWithUsers(
      createDatabase(this.env.DB),
      organizationId
    );

    // Deduplicated because one person can hold more than one membership row,
    // and a duplicate here is a duplicate email in somebody's inbox.
    return [
      ...new Set(
        memberships
          .map((membership) => membership.user.email)
          .filter((email): email is string => Boolean(email))
      ),
    ];
  }
}
