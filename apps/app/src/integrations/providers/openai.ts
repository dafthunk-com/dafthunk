import Sparkles from "lucide-react/icons/sparkles";

import type { ProviderConfig } from "../types";

export const openaiProvider: ProviderConfig = {
  id: "openai",
  name: "OpenAI",
  description: "Connect to OpenAI API with your API key",
  icon: Sparkles,
  supportsOAuth: false,
  apiKeyUrl: "https://platform.openai.com/api-keys",
  apiKeyInstructions:
    "Create a new secret key in your OpenAI Platform and paste it below.",
};
