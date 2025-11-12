/**
 * Auth Context Utility
 *
 * Extracts authentication context from JWT or API key authentication.
 */

import type { JWTTokenPayload } from "@dafthunk/types";
import type { Context } from "hono";

export interface AuthContext {
  organizationId: string;
  userId: string;
  isApiKey: boolean;
}

/**
 * Extract authentication context from either JWT or API key
 * Handles both authentication methods consistently
 */
export function getAuthContext(c: Context): AuthContext {
  const jwtPayload = c.get("jwtPayload") as JWTTokenPayload | undefined;

  if (jwtPayload) {
    // Authentication was via JWT
    // Use the organizationId from context (set by middleware based on URL param)
    // Falls back to the organization from the JWT token if not set
    const organizationId = c.get("organizationId") || jwtPayload.organization.id;
    return {
      organizationId,
      userId: jwtPayload.sub || "anonymous",
      isApiKey: false,
    };
  } else {
    // Authentication was via API key
    const organizationId = c.get("organizationId");
    if (!organizationId) {
      throw new Error("Missing organization context");
    }
    return {
      organizationId,
      userId: "api", // Placeholder for API-triggered executions
      isApiKey: true,
    };
  }
}
