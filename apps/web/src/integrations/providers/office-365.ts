import Building2 from "lucide-react/icons/building-2";

import type { ProviderConfig } from "../types";

export const office365Provider: ProviderConfig = {
  id: "office-365",
  name: "Office 365",
  description:
    "Connect your Office 365 account to access email, calendar, and files",
  icon: Building2,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/office-365/connect",
  successMessage: "Office 365 integration connected successfully",
};
