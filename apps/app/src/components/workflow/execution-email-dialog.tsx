import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const executionEmailDialogZodSchema = z.object({
  from: z
    .string()
    .email({ message: "Invalid email address for From field." })
    .min(1, { message: "From is required." }),
  subject: z.string().min(1, { message: "Subject is required." }),
  body: z.string().min(1, { message: "Body is required." }),
});

type ExecutionEmailDialogFormShape = z.infer<
  typeof executionEmailDialogZodSchema
>;

export interface EmailData {
  from: string;
  subject: string;
  body: string;
}

type ExecutionEmailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  // The onSubmit prop uses EmailData, which must align with EmailDialogFormShape
  onSubmit: (formData: EmailData) => void;
  onCancel?: () => void;
};

export function ExecutionEmailDialog({
  isOpen,
  onClose,
  onSubmit,
  onCancel,
}: ExecutionEmailDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<ExecutionEmailDialogFormShape>({
    resolver: zodResolver(executionEmailDialogZodSchema),
    mode: "onChange",
    defaultValues: {
      from: "",
      subject: "",
      body: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        from: "",
        subject: "",
        body: "",
      });
    }
  }, [isOpen, reset]);

  // processSubmit now works with EmailDialogFormShape
  const processSubmit: SubmitHandler<ExecutionEmailDialogFormShape> = (
    data
  ) => {
    // onSubmit expects EmailData. Since EmailDialogFormShape and EmailData are structurally identical,
    // this assignment is safe.
    onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Simulate Email Trigger</AlertDialogTitle>
          <AlertDialogDescription>
            Fill in the details below to simulate sending an email. This will
            trigger the workflow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} id="emailTriggerForm">
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="from">
                From <span className="text-destructive font-medium">*</span>
              </Label>
              <Controller
                name="from"
                control={control}
                render={({ field }) => (
                  <Input
                    id="from"
                    {...field}
                    placeholder="sender@example.com"
                  />
                )}
              />
              {errors.from && (
                <p className="text-sm text-destructive pt-1">
                  {errors.from.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="subject">
                Subject <span className="text-destructive font-medium">*</span>
              </Label>
              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <Input id="subject" {...field} placeholder="Email Subject" />
                )}
              />
              {errors.subject && (
                <p className="text-sm text-destructive pt-1">
                  {errors.subject.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="body">
                Body <span className="text-destructive font-medium">*</span>
              </Label>
              <Controller
                name="body"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="body"
                    {...field}
                    placeholder="Email body content..."
                    className="min-h-[100px]"
                  />
                )}
              />
              {errors.body && (
                <p className="text-sm text-destructive pt-1">
                  {errors.body.message}
                </p>
              )}
            </div>
          </div>
        </form>
        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel onClick={onCancel || onClose}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="submit"
            form="emailTriggerForm"
            disabled={!isDirty || !isValid}
          >
            Send & Run Workflow
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
