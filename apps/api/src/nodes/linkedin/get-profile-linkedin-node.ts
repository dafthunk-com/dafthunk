import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * LinkedIn Get Profile node implementation
 * Gets the authenticated user's LinkedIn profile information
 */
export class GetProfileLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-profile-linkedin",
    name: "Get Profile (LinkedIn)",
    type: "get-profile-linkedin",
    description: "Get your LinkedIn profile information",
    tags: ["Social", "LinkedIn", "Profile", "Get"],
    icon: "user",
    documentation:
      "This node retrieves your LinkedIn profile information including name, headline, and profile URL. Requires a connected LinkedIn integration.",
    computeCost: 5,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "LinkedIn integration to use",
        hidden: true,
        required: true,
      },
    ],
    outputs: [
      {
        name: "userId",
        type: "string",
        description: "LinkedIn user ID",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Full name",
        hidden: false,
      },
      {
        name: "givenName",
        type: "string",
        description: "First name",
        hidden: true,
      },
      {
        name: "familyName",
        type: "string",
        description: "Last name",
        hidden: true,
      },
      {
        name: "email",
        type: "string",
        description: "Email address",
        hidden: false,
      },
      {
        name: "picture",
        type: "string",
        description: "Profile picture URL",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a LinkedIn integration."
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get user profile information
      const response = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get profile via LinkedIn API: ${errorData}`
        );
      }

      const profile = (await response.json()) as {
        sub: string;
        name?: string;
        given_name?: string;
        family_name?: string;
        email?: string;
        picture?: string;
      };

      return this.createSuccessResult({
        userId: profile.sub,
        name: profile.name || "",
        givenName: profile.given_name || "",
        familyName: profile.family_name || "",
        email: profile.email || "",
        picture: profile.picture || "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting LinkedIn profile"
      );
    }
  }
}
