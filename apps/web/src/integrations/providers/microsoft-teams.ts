import Users from "lucide-react/icons/users";

import type { ProviderConfig } from "../types";

export const microsoftTeamsProvider: ProviderConfig = {
  id: "microsoft-teams",
  name: "Microsoft Teams",
  description:
    "Connect your Microsoft Teams account to send messages and manage channels",
  icon: Users,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/microsoft-teams/connect",
  successMessage: "Microsoft Teams integration connected successfully",
};
