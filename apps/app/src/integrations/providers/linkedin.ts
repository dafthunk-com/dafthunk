import Briefcase from "lucide-react/icons/briefcase";

import type { ProviderConfig } from "../types";

export const linkedinProvider: ProviderConfig = {
  id: "linkedin",
  name: "LinkedIn",
  description:
    "Connect your LinkedIn account to share posts and manage your profile",
  icon: Briefcase,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/linkedin/connect",
  successMessage: "LinkedIn integration connected successfully",
};
