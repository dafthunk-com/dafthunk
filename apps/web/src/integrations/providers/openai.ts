import Sparkles from "lucide-react/icons/sparkles";

import type { ProviderConfig } from "../types";

export const openaiProvider: ProviderConfig = {
  id: "openai",
  name: "OpenAI",
  description: "Connect to OpenAI API with your API key",
  icon: Sparkles,
  supportsOAuth: false,
};
