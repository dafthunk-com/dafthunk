import type { ReactNode } from "react";

import { bestLowCodeWorkflowAutomationToolsContent } from "./best-low-code-workflow-automation-tools";
import { bestOpenSourceWorkflowAutomationToolsContent } from "./best-open-source-workflow-automation-tools";
import { buildingEffectiveAgentsContent } from "./building-effective-agents";
import { durableExecutionContent } from "./durable-execution";
import { workflowAutomationExamplesContent } from "./workflow-automation-examples";

export const blogPostContent: Record<string, ReactNode> = {
  "best-low-code-workflow-automation-tools":
    bestLowCodeWorkflowAutomationToolsContent,
  "best-open-source-workflow-automation-tools":
    bestOpenSourceWorkflowAutomationToolsContent,
  "building-effective-agents": buildingEffectiveAgentsContent,
  "durable-execution": durableExecutionContent,
  "workflow-automation-examples": workflowAutomationExamplesContent,
};
