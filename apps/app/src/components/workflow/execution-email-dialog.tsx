import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface EmailData {
  from: string;
  subject: string;
  body: string;
}

type ExecutionEmailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: EmailData) => void;
  onCancel?: () => void;
};

export function ExecutionEmailDialog({
  isOpen,
  onClose,
  onSubmit,
  onCancel,
}: ExecutionEmailDialogProps) {
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const isValid =
    from.trim() !== "" &&
    from.includes("@") &&
    subject.trim() !== "" &&
    body.trim() !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ from, subject, body });
    setFrom("");
    setSubject("");
    setBody("");
    onClose();
  };

  const handleClose = () => {
    setFrom("");
    setSubject("");
    setBody("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[500px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Simulate Email Trigger
          </DialogTitle>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="sender@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email Subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={onCancel || handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isValid}>
            Send & Run
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
