import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface HumanInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (response: { text?: string; approved?: boolean }) => void;
  prompt: string;
  context?: string;
  inputType: string;
}

export function HumanInputDialog({
  isOpen,
  onClose,
  onSubmit,
  prompt,
  context,
  inputType,
}: HumanInputDialogProps) {
  const [text, setText] = useState("");

  const handleSubmitText = () => {
    onSubmit({ text });
    setText("");
  };

  const handleApprove = () => {
    onSubmit({ approved: true });
  };

  const handleReject = () => {
    onSubmit({ approved: false });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[500px]">
        <DialogTitle>Human Input Required</DialogTitle>

        <div className="space-y-4">
          <p className="text-sm text-foreground">{prompt}</p>

          {context && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {context}
            </div>
          )}

          {inputType === "approve" ? (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReject}>
                <X className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={handleApprove}>
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your response..."
                rows={4}
              />
              <div className="flex justify-end">
                <Button onClick={handleSubmitText} disabled={!text.trim()}>
                  Submit
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
