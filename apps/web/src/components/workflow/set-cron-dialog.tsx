import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const cronSchema = z.object({
  cronExpression: z.string().min(1, "Cron expression is required."),
  // Example: 5-field cron expression basic validation (can be enhanced)
  // .regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, "Invalid cron expression format."),
  active: z.boolean(),
});

export type CronFormData = z.infer<typeof cronSchema>;

// Helper function to create strictly typed default values
const getInitialFormValues = (
  initialData?: Partial<CronFormData>
): CronFormData => {
  return {
    cronExpression: initialData?.cronExpression || "",
    active: initialData?.active === undefined ? true : initialData.active,
  };
};

interface SetCronDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CronFormData) => void;
  initialData?: Partial<CronFormData>;
  workflowName?: string;
}

export function SetCronDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  workflowName,
}: SetCronDialogProps) {
  const form = useForm<CronFormData>({
    resolver: zodResolver(cronSchema), // Reverted to simple form
    defaultValues: getInitialFormValues(initialData), // Use helper function
  });

  useEffect(() => {
    // Reset form with strictly typed values when initialData or isOpen changes
    form.reset(getInitialFormValues(initialData));
  }, [initialData, form, isOpen]);

  const handleSubmit = (data: CronFormData) => {
    onSubmit(data);
    onClose(); // Close dialog on submit
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Set Schedule for {workflowName || "Workflow"}
          </DialogTitle>
          <DialogDescription>
            Define the cron schedule for this workflow. Uses standard 5-field
            cron syntax.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-2 pb-4"
          >
            <FormField
              control={form.control}
              name="cronExpression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron Expression</FormLabel>
                  <FormControl>
                    <Input placeholder="* * * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    E.g., "0 * * * *" for hourly, or "*/5 * * * *" for every 5
                    minutes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Enable or disable this cron schedule.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Schedule</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
