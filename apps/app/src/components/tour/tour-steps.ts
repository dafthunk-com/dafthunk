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
    id: "create-workflow",
    title: "Create Workflow",
    content:
      "Create a new workflow from scratch. Choose from manual triggers, scheduled runs, HTTP webhooks, and more.",
    targetSelector: '[data-tour="create-workflow-button"]',
    spotlightPadding: 2,
  },
  {
    id: "import-template",
    title: "Import Template",
    content:
      "Start faster by importing from our template library. Templates include pre-built workflows for common use cases.",
    targetSelector: '[data-tour="import-template-button"]',
    spotlightPadding: 2,
  },
  {
    id: "workflows",
    title: "Workflows",
    content:
      "Track how many workflows you've created. Workflows are the building blocks of your automations.",
    targetSelector: '[data-tour="workflows-card"]',
    spotlightPadding: 2,
  },
  {
    id: "deployments",
    title: "Deployments",
    content:
      "See your active deployments. Deploy workflows to run on schedules, respond to webhooks, or process messages.",
    targetSelector: '[data-tour="deployments-card"]',
    spotlightPadding: 2,
  },
  {
    id: "executions",
    title: "Executions",
    content:
      "Monitor your workflow executions. Track run history, check outputs, and debug any issues.",
    targetSelector: '[data-tour="executions-card"]',
    spotlightPadding: 2,
  },
  {
    id: "emails",
    title: "Emails",
    content:
      "Set up email triggers to start workflows when emails are received. Each email address can trigger one or more specific workflows.",
    targetSelector: '[data-tour="emails-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "queues",
    title: "Queues",
    content:
      "Create message queues to trigger workflows asynchronously. Queues are great for processing tasks and iterating in the background.",
    targetSelector: '[data-tour="queues-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "datasets",
    title: "Datasets",
    content:
      "Store and manage files that your workflows can access. Upload CSVs, images, documents, and more. Datasets are automatically indexed for retrieval-aumented generation.",
    targetSelector: '[data-tour="datasets-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "databases",
    title: "Databases",
    content:
      "Create SQLite databases to store structured data. Perfect for persisting workflow results and building stateful applications.",
    targetSelector: '[data-tour="databases-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "integrations",
    title: "Integrations",
    content:
      "Connect external services like Google, GitHub, Discord, and more. Integrations enable your workflows to interact with third-party APIs.",
    targetSelector: '[data-tour="integrations-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "secrets",
    title: "Secrets",
    content:
      "Store sensitive values like API keys and passwords securely. Secrets are encrypted and can be used in your workflows.",
    targetSelector: '[data-tour="secrets-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "api-keys",
    title: "API Keys",
    content:
      "Generate API keys to trigger workflows programmatically. Use these keys to integrate Dafthunk with your own applications.",
    targetSelector: '[data-tour="api-keys-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "members",
    title: "Members",
    content:
      "Invite team members to collaborate on workflows. Manage roles and permissions for your organization.",
    targetSelector: '[data-tour="members-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "billing",
    title: "Billing",
    content:
      "View your usage and manage your subscription. Upgrade your plan for more executions and advanced features.",
    targetSelector: '[data-tour="billing-nav"]',
    spotlightPadding: 2,
  },
  {
    id: "settings",
    title: "Settings",
    content:
      "Access your account settings to manage your profile, preferences, and notification options.",
    targetSelector: '[data-tour="settings-link"]',
    spotlightPadding: 2,
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
