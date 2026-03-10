import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useEndpoint } from "@/services/endpoint-service";

import { EndpointSetupInfo } from "./endpoint-setup-info";

interface EndpointTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  endpointId: string | null;
  orgHandle: string;
}

export function EndpointTriggerDialog({
  isOpen,
  onClose,
  endpointId,
  orgHandle,
}: EndpointTriggerDialogProps) {
  const { endpoint, isEndpointLoading } = useEndpoint(endpointId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Endpoint Integration
          </DialogTitle>
        </div>

        <div className="p-4">
          {isEndpointLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !endpoint ? (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                No endpoint selected
              </p>
              <p>Select an endpoint to view integration details.</p>
            </div>
          ) : (
            <EndpointSetupInfo
              mode={endpoint.mode as "webhook" | "request"}
              orgHandle={orgHandle}
              endpointId={endpoint.id}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
