import Calendar from "lucide-react/icons/calendar";

import type { ProviderConfig } from "../types";

export const googleCalendarProvider: ProviderConfig = {
  id: "google-calendar",
  name: "Google Calendar",
  description: "Sync with Google Calendar to manage events",
  icon: Calendar,
  supportsOAuth: true,
  oauthEndpoint: "/oauth/google-calendar/connect",
  successMessage: "Google Calendar integration connected successfully",
};
