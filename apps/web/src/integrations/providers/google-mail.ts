import Mail from "lucide-react/icons/mail";

import type { ProviderConfig } from "../types";

export const googleMailProvider: ProviderConfig = {
  id: "google-mail",
  name: "Google Mail",
  description: "Connect your Google Mail account to send and receive emails",
  icon: Mail,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/google-mail/connect",
  successMessage: "Google Mail integration connected successfully",
};
