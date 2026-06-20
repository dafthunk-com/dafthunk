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
    id: "resources",
    title: "Resources",
    content:
      "Manage everything your workflows draw on: schemas, databases, datasets, and secrets, plus the connections that can start a workflow — integrations, email, queues, and bots. Other triggers (manual, HTTP, form) are added as nodes inside the editor.",
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
