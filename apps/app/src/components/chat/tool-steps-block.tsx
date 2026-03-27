import type { ToolStep } from "@dafthunk/types";
import ChevronRight from "lucide-react/icons/chevron-right";
import Loader from "lucide-react/icons/loader";
import { useState } from "react";

import { cn } from "@/utils/utils";

const TOOL_VERBS: Record<string, string> = {
  getOrgState: "Checked org state",
  listTemplates: "Browsed templates",
  checkTemplateRequirements: "Checked requirements",
  listResources: "Listed resources",
  navigateUser: "Navigated",
  searchNodes: "Searched nodes",
  getWorkflow: "Read workflow",
};

function summarizeSteps(steps: ToolStep[]): string {
  const verbs = steps.map((s) => TOOL_VERBS[s.tool] ?? s.description);
  const unique = [...new Set(verbs)];
  if (unique.length <= 2) return unique.join(" and ");
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

export function ToolStepsBlock({
  steps,
  isActive,
}: {
  steps: ToolStep[];
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {isActive ? (
          <Loader className="size-3 animate-spin shrink-0" />
        ) : (
          <ChevronRight
            className={cn(
              "size-3 shrink-0 transition-transform",
              expanded && "rotate-90"
            )}
          />
        )}
        <span>
          {isActive
            ? steps[steps.length - 1].description
            : summarizeSteps(steps)}
        </span>
      </button>
      {expanded && (
        <ul className="mt-1 ml-4.5 space-y-0.5 text-xs text-muted-foreground">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-muted-foreground/40 shrink-0" />
              {step.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
