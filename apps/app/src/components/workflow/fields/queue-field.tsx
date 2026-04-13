import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createQueue, useQueues } from "@/services/queue-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function QueueField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { queues, isQueuesLoading, mutateQueues } = useQueues();
  const { organization } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const stringValue = String(value ?? "");

  const handleChange = (val: string) => {
    if (val === CREATE_NEW) {
      setIsCreateDialogOpen(true);
      return;
    }
    onChange(val || undefined);
  };

  const handleCreate = async (name: string) => {
    if (!organization?.id) return;
    const response = await createQueue({ name }, organization.id);
    await mutateQueues();
    onChange(response.id);
    setIsCreateDialogOpen(false);
  };

  if (disabled) {
    const label = queues?.find((q) => q.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No queue"}
            >
              {connected ? "Connected" : label || "No queue"}
            </SelectValue>
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={handleChange}
        disabled={isQueuesLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isQueuesLoading
                  ? "Loading..."
                  : queues?.length === 0
                    ? "No queues"
                    : "Select queue"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {queues?.map((queue) => (
            <SelectItem key={queue.id} value={queue.id} className="text-xs">
              {queue.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW} className="text-xs">
            + New Queue
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Queue</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string;
              await handleCreate(name);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Queue Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter queue name"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Queue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
