import Database from "lucide-react/icons/database";
import RefreshCw from "lucide-react/icons/refresh-cw";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIntegrations } from "@/integrations";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface IntegrationSelectorWidgetProps extends BaseWidgetProps {
  value: string;
  provider: string;
}

function IntegrationSelectorWidget({
  value,
  provider,
  onChange,
  className,
  readonly = false,
}: IntegrationSelectorWidgetProps) {
  const { integrations, error, isLoading, mutate } = useIntegrations();

  const handleSelect = (integrationId: string) => {
    if (!readonly) {
      onChange(integrationId);
    }
  };

  const filteredIntegrations = integrations?.filter(
    (i) => i.provider === provider
  );

  if (error) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Database className="h-4 w-4 mx-auto mb-1" />
          {error.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutate}
          className="text-xs h-6"
          disabled={isLoading}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={value || ""}
        onValueChange={handleSelect}
        disabled={readonly || isLoading}
      >
        <SelectTrigger className="text-xs h-7">
          <SelectValue
            placeholder={isLoading ? "Loading..." : "Select integration..."}
          />
        </SelectTrigger>
        <SelectContent>
          {filteredIntegrations?.map((integration) => (
            <SelectItem
              key={integration.id}
              value={integration.id}
              className="text-xs"
            >
              {integration.name}
            </SelectItem>
          ))}
          {filteredIntegrations?.length === 0 && !isLoading && (
            <SelectItem disabled value="none" className="text-xs">
              No integrations found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Helper to create integration selector widgets for different providers
 * This replaces the giant switch statements with a simple factory function
 */
export function createIntegrationWidget(provider: string, nodeTypes: string[]) {
  return createWidget({
    component: IntegrationSelectorWidget,
    nodeTypes,
    inputField: "integrationId",
    extractConfig: (_nodeId, inputs) => ({
      value: getInputValue(inputs, "integrationId", ""),
      provider,
    }),
  });
}

// Export widgets for each integration provider
export const googleMailWidget = createIntegrationWidget("google-mail", [
  "send-email-google-mail",
  "read-inbox-google-mail",
  "create-reply-draft-google-mail",
  "check-draft-google-mail",
  "send-draft-google-mail",
  "delete-draft-google-mail",
  "update-draft-google-mail",
  "mark-message-google-mail",
  "modify-labels-google-mail",
  "search-messages-google-mail",
  "get-message-google-mail",
  "archive-message-google-mail",
  "trash-message-google-mail",
]);

export const googleCalendarWidget = createIntegrationWidget("google-calendar", [
  "create-event-google-calendar",
  "list-events-google-calendar",
  "get-event-google-calendar",
  "update-event-google-calendar",
  "delete-event-google-calendar",
  "search-events-google-calendar",
  "add-attendees-google-calendar",
  "check-availability-google-calendar",
  "quick-add-google-calendar",
  "list-calendars-google-calendar",
]);

export const discordWidget = createIntegrationWidget("discord", [
  "send-message-discord",
  "send-dm-discord",
  "get-channel-discord",
  "list-guild-channels-discord",
  "get-guild-discord",
  "list-user-guilds-discord",
  "add-reaction-discord",
]);

export const redditWidget = createIntegrationWidget("reddit", [
  "submit-post-reddit",
  "submit-comment-reddit",
  "get-subreddit-reddit",
  "get-user-reddit",
  "list-posts-reddit",
  "vote-reddit",
]);

export const linkedInWidget = createIntegrationWidget("linkedin", [
  "share-post-linkedin",
  "get-profile-linkedin",
  "comment-on-post-linkedin",
  "like-post-linkedin",
  "get-post-comments-linkedin",
  "get-post-likes-linkedin",
  "get-member-profile-linkedin",
  "get-organization-linkedin",
]);

export const microsoftTeamsWidget = createIntegrationWidget("microsoft-teams", [
  "send-channel-message-teams",
  "list-teams",
  "list-channels-teams",
]);

export const githubWidget = createIntegrationWidget("github", [
  "get-repository-github",
  "get-user-github",
  "search-repositories-github",
  "star-repository-github",
  "unstar-repository-github",
  "follow-user-github",
  "unfollow-user-github",
  "get-file-contents-github",
  "create-update-file-github",
  "delete-file-github",
  "list-user-repositories-github",
  "list-organization-repositories-github",
]);

export const openaiWidget = createIntegrationWidget("openai", [
  "gpt-41",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
]);

export const anthropicWidget = createIntegrationWidget("anthropic", [
  "claude-3-opus",
  "claude-35-haiku",
  "claude-35-sonnet",
  "claude-37-sonnet",
  "claude-opus-4",
  "claude-opus-41",
  "claude-sonnet-4",
]);

export const geminiWidget = createIntegrationWidget("gemini", [
  "gemini-2-5-flash",
  "gemini-2-5-pro",
  "gemini-2-5-flash-image-preview",
  "gemini-2-5-flash-audio-understanding",
  "gemini-2-5-flash-image-understanding",
  "gemini-2-5-flash-tts",
  "imagen",
]);
