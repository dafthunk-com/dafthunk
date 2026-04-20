import { useId, useState } from "react";

import { CodeBlock } from "./code-block";

export interface CodeTab {
  label: string;
  html: string;
  raw: string;
}

interface CodeTabsProps {
  tabs: CodeTab[];
}

export function CodeTabs({ tabs }: CodeTabsProps) {
  const [active, setActive] = useState(0);
  const baseId = useId();

  return (
    <div className="not-prose">
      <div role="tablist" className="flex gap-1 border-b border-gray-200 mb-3">
        {tabs.map((tab, i) => {
          const isActive = i === active;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(i)}
              className={
                isActive
                  ? "px-4 py-2 text-sm font-medium text-gray-900 border-b-2 border-gray-900 -mb-px"
                  : "px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent -mb-px"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
        >
          <CodeBlock html={tab.html} raw={tab.raw} />
        </div>
      ))}
    </div>
  );
}
