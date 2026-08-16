import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { instagramRequest } from "./instagram-api";

interface InstagramProfile {
  user_id?: string | number;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

/**
 * Instagram Get Profile node implementation
 * Retrieves the connected account's Instagram profile
 */
export class GetProfileInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-profile-instagram",
    name: "Get Profile (Instagram)",
    type: "get-profile-instagram",
    description: "Get the connected Instagram account's profile",
    tags: ["Social", "Instagram", "Profile", "Get"],
    icon: "instagram",
    documentation:
      "This node retrieves the profile of the connected Instagram professional account: username, display name, account type, profile picture, and follower/following/media counts. Requires a connected Instagram integration.",
    usage: 10,
    asTool: true,
    inlinable: false,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "instagram",
        description: "Instagram integration to use",
        hidden: true,
        required: true,
      },
    ],
    outputs: [
      {
        name: "username",
        type: "string",
        description: "Account username",
      },
      {
        name: "name",
        type: "string",
        description: "Display name",
      },
      {
        name: "followersCount",
        type: "number",
        description: "Number of followers",
      },
      {
        name: "followsCount",
        type: "number",
        description: "Number of accounts followed",
        hidden: true,
      },
      {
        name: "mediaCount",
        type: "number",
        description: "Number of published posts",
        hidden: true,
      },
      {
        name: "profile",
        type: "json",
        description: "Full profile data",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }

      const integration = await context.getIntegration(integrationId);

      const profile = await instagramRequest<InstagramProfile>(
        "get Instagram profile",
        "me",
        integration.token,
        {
          params: {
            fields:
              "user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
          },
        }
      );

      return this.createSuccessResult({
        username: profile.username ?? "",
        name: profile.name ?? "",
        followersCount: profile.followers_count ?? 0,
        followsCount: profile.follows_count ?? 0,
        mediaCount: profile.media_count ?? 0,
        profile,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting Instagram profile"
      );
    }
  }
}
