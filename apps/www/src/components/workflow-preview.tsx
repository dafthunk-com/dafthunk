import { cn } from "../lib/utils";

interface WorkflowPreviewProps {
  templateId: string;
  className?: string;
  showBackground?: boolean;
}

// App URL - in production this would point to the app domain
const APP_URL = import.meta.env.VITE_APP_URL || "https://app.dafthunk.com";

/**
 * Workflow preview component that embeds the actual workflow builder from apps/app
 * using an iframe. This ensures the preview always matches the real workflow editor.
 */
export function WorkflowPreview({
  templateId,
  className = "",
  showBackground = true,
}: WorkflowPreviewProps) {
  const embedUrl = `${APP_URL}/embed/templates/${templateId}${showBackground ? "" : "?bg=false"}`;

  return (
    <div className={cn("rounded-xl overflow-hidden bg-neutral-50", className)}>
      <iframe
        src={embedUrl}
        title={`Workflow preview for ${templateId}`}
        className="w-full h-full border-0"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
