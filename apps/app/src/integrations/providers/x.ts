import Twitter from "lucide-react/icons/twitter";

import type { ProviderConfig } from "../types";

export const xProvider: ProviderConfig = {
  id: "x",
  name: "X",
  description:
    "Connect your X account to post tweets, search, and interact with users",
  icon: Twitter,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/x/connect",
  successMessage: "X integration connected successfully",
};
