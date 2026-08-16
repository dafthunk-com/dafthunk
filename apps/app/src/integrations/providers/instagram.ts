import Instagram from "lucide-react/icons/instagram";

import type { ProviderConfig } from "../types";

export const instagramProvider: ProviderConfig = {
  id: "instagram",
  name: "Instagram",
  description:
    "Connect your Instagram professional account to publish images and reels",
  icon: Instagram,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/instagram/connect",
  successMessage: "Instagram integration connected successfully",
};
