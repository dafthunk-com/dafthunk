import { cn } from "../lib/utils";

interface WorkflowPreviewProps {
  templateId: string;
  className?: string;
  showBackground?: boolean;
  /**
   * Whitespace around the workflow inside the embed, expressed as a fraction
   * of the iframe (passed to React Flow's `fitView`). Lower values crop
   * tighter; higher values leave more breathing room. Defaults to 0.25.
   */
  padding?: number;
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
  padding,
}: WorkflowPreviewProps) {
  const params = new URLSearchParams();
  if (!showBackground) params.set("bg", "false");
  if (padding !== undefined) params.set("padding", String(padding));
  const query = params.toString();
  const embedUrl = `${APP_URL}/embed/templates/${templateId}${query ? `?${query}` : ""}`;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        showBackground && "bg-neutral-50",
        className
      )}
    >
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
