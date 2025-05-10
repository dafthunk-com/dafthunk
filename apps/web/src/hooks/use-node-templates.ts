import { useState, useEffect } from "react";
import type { NodeTemplate } from "@/components/workflow/workflow-types";
import { fetchNodeTypes } from "@/services/workflowNodeService";

export function useNodeTemplates() {
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    const loadNodeTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const types = await fetchNodeTypes();
        const templates: NodeTemplate[] = types.map((type) => ({
          id: type.id,
          type: type.id,
          name: type.name,
          description: type.description || "",
          category: type.category,
          inputs: type.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            description: input.description,
            hidden: input.hidden,
          })),
          outputs: type.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            description: output.description,
            hidden: output.hidden,
          })),
        }));
        setNodeTemplates(templates);
        setTemplatesError(null);
      } catch (_) {
        setTemplatesError(
          "Failed to load node templates. Please try again later."
        );
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadNodeTemplates();
  }, []);

  return { nodeTemplates, isLoadingTemplates, templatesError };
}
