import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useQueue } from "@/services/queue-service";

import { QueueSetupInfo } from "./queue-setup-info";

interface QueueTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  queueId: string | null;
}

export function QueueTriggerDialog({
  isOpen,
  onClose,
  queueId,
}: QueueTriggerDialogProps) {
  const { queue, isQueueLoading } = useQueue(queueId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Queue Integration
          </DialogTitle>
        </div>

        <div className="p-4">
          {isQueueLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !queue ? (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                No queue selected
              </p>
              <p>Select a queue to view publish endpoints.</p>
            </div>
          ) : (
            <QueueSetupInfo queueId={queue.id} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
