import Github from "lucide-react/icons/github";

import type { ProviderConfig } from "../types";

export const githubProvider: ProviderConfig = {
  id: "github",
  name: "GitHub",
  description:
    "Connect your GitHub account to manage repositories, issues, and pull requests",
  icon: Github,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/github/connect",
  successMessage: "GitHub integration connected successfully",
};
