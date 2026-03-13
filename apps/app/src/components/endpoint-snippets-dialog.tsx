import { CodeBlock } from "@/components/docs/code-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXECUTE_ENDPOINT_SNIPPETS } from "@/components/workflow/api-snippets";
import { getApiBaseUrl } from "@/config/api";

interface EndpointSnippetsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  endpointName: string;
  endpointId: string;
  endpointMode: string;
}

export function EndpointSnippetsDialog({
  isOpen,
  onClose,
  endpointName,
  endpointId,
  endpointMode,
}: EndpointSnippetsDialogProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const executeUrl = `${baseUrl}/endpoints/${endpointId}/execute`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{endpointName || "Untitled Endpoint"}</DialogTitle>
          <DialogDescription>
            {endpointMode === "webhook"
              ? "This endpoint executes asynchronously and returns an execution ID. Poll the status endpoint for results."
              : "This endpoint executes synchronously and returns the response defined by the HTTP Response node."}
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
  );
}
