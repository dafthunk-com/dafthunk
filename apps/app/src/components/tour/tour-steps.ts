export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string;
  spotlightPadding?: number;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "organization",
    title: "Organization",
    content:
      "This is your current organization. You can switch between organizations or create new ones to manage different contexts.",
    targetSelector: '[data-tour="organization-switcher"]',
    spotlightPadding: 2,
  },
  {
    id: "workflows",
    title: "Workflows",
    content:
      "Build and manage your workflows, monitor executions, explore templates, and test individual nodes in the playground.",
    targetSelector: '[data-tour="workflows-nav-group"]',
    spotlightPadding: 4,
  },
  {
    id: "triggers",
    title: "Triggers",
    content:
      "Configure how your workflows are started. Use HTTP endpoints, incoming emails, message queues, or chat bots to trigger executions.",
    targetSelector: '[data-tour="triggers-nav-group"]',
    spotlightPadding: 4,
  },
  {
    id: "resources",
    title: "Resources",
    content:
      "Manage your data and connections. Store files in datasets, persist structured data in databases, connect external services, and securely store API keys.",
    targetSelector: '[data-tour="resources-nav-group"]',
    spotlightPadding: 4,
  },
  {
    id: "settings",
    title: "Settings",
    content:
      "Generate API keys for programmatic access, invite team members, and manage your billing and subscription.",
    targetSelector: '[data-tour="settings-nav-group"]',
    spotlightPadding: 4,
  },
  {
    id: "documentation",
    title: "Documentation",
    content:
      "Explore our documentation to learn more about Dafthunk features, nodes, and best practices. You're all set!",
    targetSelector: '[data-tour="documentation-link"]',
    spotlightPadding: 2,
  },
];
