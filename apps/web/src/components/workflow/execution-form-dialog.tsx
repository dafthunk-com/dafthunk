import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

// Describes the structure of parameters passed to the dialog
export type DialogFormParameter = {
  nodeId: string; // Unique ID of the node
  nameForForm: string; // The key to use in the form data object, e.g., 'customer_email'
  label: string; // User-friendly label for the form input, e.g., "Customer Email"
  nodeName: string; // Original name of the workflow node, for context
  isRequired: boolean; // Whether this parameter is required
  type: string; // Parameter type, e.g., 'parameter.string', 'parameter.number'
};

type ExecutionFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  parameters: DialogFormParameter[];
};

// Dynamically builds a Zod validation schema based on the parameters
const createValidationSchema = (parameters: DialogFormParameter[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  parameters.forEach((param) => {
    // Currently only handles string parameters; extendable for other types
    if (param.type.startsWith("parameter.string")) {
      let validator: z.ZodTypeAny; // Declare as ZodTypeAny
      const stringBase = z.string().trim(); // Base string validator

      if (param.isRequired) {
        validator = stringBase.min(1, {
          message: `${param.label} is required.`,
        });
      } else {
        // For optional fields, allow empty string, then transform to undefined
        validator = stringBase
          .optional()
          .transform((val) => (val === "" || val === null ? undefined : val));
      }
      schemaShape[param.nameForForm] = validator;
    }
    // TODO: Add validation for other parameter types (e.g., number, boolean)
  });
  return z.object(schemaShape);
};

export function ExecutionFormDialog({
  isOpen,
  onClose,
  onSubmit,
  parameters,
}: ExecutionFormDialogProps) {
  const validationSchema = createValidationSchema(parameters);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<Record<string, any>>({
    resolver: zodResolver(validationSchema),
    mode: "onChange", // Validate on change to enable/disable submit button
    defaultValues: parameters.reduce((acc, param) => {
      acc[param.nameForForm] = ""; // Initialize with empty strings
      return acc;
    }, {} as Record<string, any>),
  });

  // Reset form when dialog opens or parameters change
  useEffect(() => {
    if (isOpen) {
      const defaultValues = parameters.reduce((acc, param) => {
        acc[param.nameForForm] = "";
        return acc;
      }, {} as Record<string, any>);
      reset(defaultValues);
    }
  }, [isOpen, parameters, reset]);

  const processSubmit: SubmitHandler<Record<string, any>> = (data) => {
    // Filter out undefined values before submitting
    const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    onSubmit(filteredData);
    onClose(); // Close dialog after submission
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Workflow Execution Parameters</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide the required parameters to run this workflow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} id="executionParamsForm">
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {parameters.map((param) => (
              <div key={param.nodeId} className="space-y-1.5">
                <Label htmlFor={param.nameForForm}>
                  {param.label}
                  {param.isRequired && (
                    <span className="text-destructive font-medium">*</span>
                  )}
                </Label>
                <Controller
                  name={param.nameForForm}
                  control={control}
                  render={({ field }) => (
                    <Input
                      id={param.nameForForm}
                      {...field}
                      placeholder={`Enter ${param.label.toLowerCase()}`}
                      className="w-full"
                    />
                  )}
                />
                 <p className="text-xs text-muted-foreground">
                  (Node: "{param.nodeName}", Field: "{param.nameForForm}")
                </p>
                {errors[param.nameForForm] && (
                  <p className="text-sm text-destructive pt-1">
                    {errors[param.nameForForm]?.message as string}
                  </p>
                )}
              </div>
            ))}
          </div>
        </form>
        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form="executionParamsForm"
            disabled={!isDirty || !isValid}
          >
            Run Workflow
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
