import Globe from "lucide-react/icons/globe";
import { useState } from "react";
import { useParams } from "react-router";

import { CodeBlock } from "@/components/docs/code-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiBaseUrl } from "@/config/api";
import { cn } from "@/utils/utils";

import { EXECUTE_ENDPOINT_SNIPPETS } from "../../api-snippets";
import { createWidget } from "../widget";

type HttpTriggerMode = "request" | "webhook";

interface HttpTriggerInputProps {
  mode: HttpTriggerMode;
  className?: string;
  disabled?: boolean;
}

/**
 * Widget for the HTTP trigger nodes. The execution URL is derived from the
 * workflow id (`/http/:workflowId`) — there is no endpoint to select — so the
 * widget is just an "Integrate" button that reveals the HTTP Trigger dialog
 * with copy-paste snippets for calling it with an API key.
 */
function HttpTriggerInputWidget({
  mode,
  className,
  disabled = false,
}: HttpTriggerInputProps) {
  const { id: workflowId } = useParams<{ id: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const executeUrl = workflowId
    ? `${getApiBaseUrl().replace(/\/$/, "")}/http/${workflowId}`
    : "";

  return (
    <div className={cn("p-2", className)}>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled || !workflowId}
        onClick={() => setIsDialogOpen(true)}
      >
        <Globe className="h-3 w-3" />
        Integrate
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>HTTP Trigger</DialogTitle>
            <DialogDescription>
              {mode === "webhook"
                ? "Executes asynchronously and returns an execution ID. Poll the status endpoint for results."
                : "Executes synchronously and returns the execution result, including each node's output."}{" "}
              Authenticate with an API key from your account settings. Enable
              the workflow before calling it.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="curl" className="w-full min-w-0">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="mt-4 min-w-0">
              <CodeBlock language="bash">
                {EXECUTE_ENDPOINT_SNIPPETS.curl(executeUrl)}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4 min-w-0">
              <CodeBlock language="javascript">
                {EXECUTE_ENDPOINT_SNIPPETS.javascript(executeUrl)}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="python" className="mt-4 min-w-0">
              <CodeBlock language="python">
                {EXECUTE_ENDPOINT_SNIPPETS.python(executeUrl)}
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const httpRequestTriggerWidget = createWidget({
  component: HttpTriggerInputWidget,
  inputField: "",
  nodeTypes: ["http-request"],
  extractConfig: () => ({ mode: "request" as HttpTriggerMode }),
});

export const httpWebhookTriggerWidget = createWidget({
  component: HttpTriggerInputWidget,
  inputField: "",
  nodeTypes: ["http-webhook"],
  extractConfig: () => ({ mode: "webhook" as HttpTriggerMode }),
});
