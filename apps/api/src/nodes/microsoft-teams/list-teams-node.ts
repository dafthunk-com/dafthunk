import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Microsoft Teams List Teams node implementation
 * Lists teams the authenticated user is a member of
 */
export class ListTeamsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-teams",
    name: "List Teams (Teams)",
    type: "list-teams",
    description: "List Microsoft Teams that the user is a member of",
    tags: ["Communication", "Microsoft Teams", "List"],
    icon: "users",
    documentation:
      "This node retrieves a list of Microsoft Teams that the authenticated user is a member of. Requires a connected Microsoft Teams integration.",
    computeCost: 5,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Microsoft Teams integration to use",
        hidden: true,
        required: true,
      },
    ],
    outputs: [
      {
        name: "teams",
        type: "json",
        description: "Array of teams with id, displayName, and description",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of teams returned",
        hidden: true,
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
          "Integration ID is required. Please select a Microsoft Teams integration."
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      console.log("Integration retrieved:", {
        id: integration.id,
        provider: integration.provider,
        hasToken: !!integration.token,
        tokenLength: integration.token?.length,
      });

      const accessToken = integration.token;

      // Decode JWT to see what scopes are in the token
      try {
        const tokenParts = accessToken.split(".");
        console.log("Token has parts:", tokenParts.length);
        if (tokenParts.length === 3) {
          // Use atob for Workers environment
          const base64 = tokenParts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          console.log("Token payload:", {
            scp: payload.scp,
            roles: payload.roles,
            aud: payload.aud,
            appid: payload.appid,
            exp: payload.exp,
            iat: payload.iat,
          });
        }
      } catch (e) {
        console.log("Could not decode token:", e instanceof Error ? e.message : String(e));
      }

      // Validate token exists
      if (!accessToken) {
        return this.createErrorResult(
          "No access token found for Microsoft Teams integration. Please reconnect your integration."
        );
      }

      // First test if token works at all with /me endpoint
      console.log("Testing token with /me endpoint first...");
      const testResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("/me endpoint response:", {
        status: testResponse.status,
        ok: testResponse.ok,
      });
      if (!testResponse.ok) {
        const testError = await testResponse.text();
        console.error("/me endpoint error:", testError);
        return this.createErrorResult(
          `Token validation failed at /me endpoint: ${testError}`
        );
      }

      // Get teams via Microsoft Graph API
      console.log("Making request to Microsoft Graph API:", {
        url: "https://graph.microsoft.com/v1.0/me/joinedTeams",
        tokenPrefix: accessToken.substring(0, 20) + "...",
        authHeaderSet: !!accessToken,
      });

      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/joinedTeams",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Microsoft Graph API response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Microsoft Graph API error response:", errorData);
        return this.createErrorResult(
          `Failed to list teams via Microsoft Graph API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        value: Array<{
          id: string;
          displayName: string;
          description: string;
        }>;
      };

      return this.createSuccessResult({
        teams: data.value,
        count: data.value.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing teams via Microsoft Teams"
      );
    }
  }
}
