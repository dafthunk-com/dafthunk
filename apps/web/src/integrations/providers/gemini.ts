import Gem from "lucide-react/icons/gem";

import type { ProviderConfig } from "../types";

export const geminiProvider: ProviderConfig = {
  id: "gemini",
  name: "Google Gemini",
  description: "Connect to Google Gemini API with your API key",
  icon: Gem,
  supportsOAuth: false,
};
