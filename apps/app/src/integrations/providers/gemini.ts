import Gem from "lucide-react/icons/gem";

import type { ProviderConfig } from "../types";

export const geminiProvider: ProviderConfig = {
  id: "gemini",
  name: "Google Gemini",
  description: "Connect to Google Gemini API with your API key",
  icon: Gem,
  supportsOAuth: false,
  apiKeyUrl: "https://aistudio.google.com/app/apikey",
  apiKeyInstructions:
    "Create an API key in Google AI Studio and paste it below.",
};
