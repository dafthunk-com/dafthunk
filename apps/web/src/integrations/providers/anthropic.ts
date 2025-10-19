import Bot from "lucide-react/icons/bot";

import type { ProviderConfig } from "../types";

export const anthropicProvider: ProviderConfig = {
  id: "anthropic",
  name: "Anthropic",
  description: "Connect to Anthropic Claude API with your API key",
  icon: Bot,
  supportsOAuth: false,
};
