import type { Parameter } from "@dafthunk/types";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "./fields/field";
import type { WorkflowParameter } from "./workflow-types";

interface ToolConfigPanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
  toolName: string;
  /** All inputs from the node type definition */
  inputs: Parameter[];
  /** Current preset values */
  currentConfig: Record<string, unknown>;
}

/**
 * Returns inputs that can be configured as presets.
 * Includes hidden+required inputs (must be preset for tool use)
 * and any other inputs the user might want to pin.
 */
function getConfigurableInputs(inputs: Parameter[]): {
  required: Parameter[];
  optional: Parameter[];
} {
  const required: Parameter[] = [];
  const optional: Parameter[] = [];

  for (const input of inputs) {
    if (input.hidden && input.required) {
      // Hidden + required = must be preset (e.g., integrationId)
      required.push(input);
    } else if (!input.hidden) {
      // Visible inputs can optionally be pinned
      optional.push(input);
    }
  }

  return { required, optional };
}

export function ToolConfigPanel({
  open,
  onClose,
  onSave,
  toolName,
  inputs,
  currentConfig,
}: ToolConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(() => ({
    ...currentConfig,
  }));

  const { required, optional } = getConfigurableInputs(inputs);
  const configurableInputs = [...required, ...optional];

  // Check if all required fields have values
  const allRequiredSet = required.every((input) => {
    const val = config[input.name];
    return val !== undefined && val !== null && val !== "";
  });

  const handleChange = (name: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = (name: string) => {
    setConfig((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSave = () => {
    // Only include non-empty values
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(config)) {
      if (val !== undefined && val !== null && val !== "") {
        cleaned[key] = val;
      }
    }
    onSave(cleaned);
    onClose();
  };

  if (configurableInputs.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Configure {toolName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Preset values are fixed before the agent runs and hidden from the
            LLM. Use them to provide credentials or narrow the tool's behavior.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {required.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Required
              </p>
              {required.map((input) => (
                <div
                  key={input.name}
                  className="[&_button]:text-xs [&_button]:h-7"
                >
                  <Field
                    parameter={
                      {
                        ...input,
                        id: input.name,
                        hidden: false,
                      } as WorkflowParameter
                    }
                    value={config[input.name] ?? input.value}
                    onChange={(value) => handleChange(input.name, value)}
                    onClear={() => handleClear(input.name)}
                    disabled={false}
                    connected={false}
                  />
                </div>
              ))}
            </div>
          )}

          {optional.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Optional presets
              </p>
              {optional.map((input) => (
                <div
                  key={input.name}
                  className="[&_button]:text-xs [&_button]:h-7"
                >
                  <label className="text-xs text-foreground font-medium">
                    {input.name}
                  </label>
                  <Field
                    parameter={
                      {
                        ...input,
                        id: input.name,
                      } as WorkflowParameter
                    }
                    value={config[input.name]}
                    onChange={(value) => handleChange(input.name, value)}
                    onClear={() => handleClear(input.name)}
                    disabled={false}
                    connected={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!allRequiredSet}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Check if a node type requires configuration before it can be used as a tool.
 * Returns true if there are hidden+required inputs without default values.
 */
export function needsToolConfig(inputs: Parameter[]): boolean {
  return inputs.some(
    (input) => input.hidden && input.required && input.value === undefined
  );
}
