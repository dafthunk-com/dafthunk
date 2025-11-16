import MessageSquare from "lucide-react/icons/message-square";

import type { ProviderConfig } from "../types";

export const discordProvider: ProviderConfig = {
  id: "discord",
  name: "Discord",
  description:
    "Connect your Discord account to send messages and manage servers",
  icon: MessageSquare,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/discord/connect",
  successMessage: "Discord integration connected successfully",
};
