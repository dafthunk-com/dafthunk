import Newspaper from "lucide-react/icons/newspaper";

import type { ProviderConfig } from "../types";

export const wordpressProvider: ProviderConfig = {
  id: "wordpress",
  name: "WordPress",
  description:
    "Connect your WordPress.com site to publish posts, manage content, and read media",
  icon: Newspaper,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/wordpress/connect",
  successMessage: "WordPress integration connected successfully",
};
