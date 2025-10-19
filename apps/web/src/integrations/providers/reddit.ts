import MessageCircle from "lucide-react/icons/message-circle";

import type { ProviderConfig } from "../types";

export const redditProvider: ProviderConfig = {
  id: "reddit",
  name: "Reddit",
  description:
    "Connect your Reddit account to post, comment, and interact with communities",
  icon: MessageCircle,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/reddit/connect",
  successMessage: "Reddit integration connected successfully",
};
