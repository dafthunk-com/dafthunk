import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const cronSchema = z
  .object({
    cronExpression: z.string().min(1, "Cron expression is required."),
    versionAlias: z.enum(["dev", "latest", "version"]),
    versionNumber: z.coerce.number().optional().nullable(),
    active: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.versionAlias === "version") {
        return data.versionNumber !== null && data.versionNumber !== undefined;
      }
      return true;
    },
    {
      message: "A version must be selected.",
      path: ["versionNumber"],
    }
  );

type CronFormData = z.infer<typeof cronSchema>;

// Helper function to create strictly typed default values
const getInitialFormValues = (
  initialData?: Partial<CronFormData>
): CronFormData => {
  return {
    cronExpression: initialData?.cronExpression || "",
    versionAlias: initialData?.versionAlias || "dev",
    versionNumber: initialData?.versionNumber || null,
    active: initialData?.active === undefined ? true : initialData.active,
  };
};

interface SetCronDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CronFormData) => void;
  initialData?: Partial<CronFormData>;
  deploymentVersions?: number[];
  workflowName?: string;
}

export function SetCronDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  deploymentVersions = [],
  workflowName,
}: SetCronDialogProps) {
  const form = useForm({
    resolver: zodResolver(cronSchema),
    defaultValues: getInitialFormValues(initialData),
  });

  const versionAlias = useWatch({
    control: form.control,
    name: "versionAlias",
  });

  // Reset form values whenever initialData changes (e.g., after fetch or save)
  useEffect(() => {
    if (initialData) {
      form.reset(getInitialFormValues(initialData));
    }
  }, [initialData, form]);

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
              name="versionAlias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version to Run</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a version to run" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dev">
                        <div className="flex items-center">
                          <span className="font-medium">Development</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            - live-editing version
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="latest">
                        <div className="flex items-center">
                          <span className="font-medium">Latest</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            - most recent deployment
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="version">
                        <div className="flex items-center">
                          <span className="font-medium">Specific Version</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose which workflow version this schedule will execute.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {versionAlias === "version" && (
              <FormField
                control={form.control}
                name="versionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deployment Version</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a deployment version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deploymentVersions.map((version) => (
                          <SelectItem key={version} value={String(version)}>
                            <div className="flex items-center">
                              <span className="font-medium">
                                Version {version}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a specific deployment version to run.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
