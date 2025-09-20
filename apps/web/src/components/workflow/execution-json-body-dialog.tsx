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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type JsonBodyParameter = {
  nodeId: string;
  nameForForm: string;
  label: string;
  nodeName: string;
  isRequired: boolean;
};

type ExecutionJsonBodyDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  parameters: JsonBodyParameter[];
  onCancel?: () => void;
};

type FormValues = Record<string, unknown>;

// Validates if a string is valid JSON
const isValidJson = (str: string) => {
  if (!str.trim()) return false;
  try {
    JSON.parse(str);
    return true;
  } catch (_error) {
    return false;
  }
};

// Creates validation schema for JSON body parameters
const createValidationSchema = (parameters: JsonBodyParameter[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  parameters.forEach((param) => {
    const jsonValidator = z
      .string()
      .refine(
        (val) =>
          !param.isRequired || (val.trim().length > 0 && isValidJson(val)),
        {
          message: param.isRequired
            ? `${param.label} is required and must be valid JSON`
            : `${param.label} must be valid JSON`,
        }
      );

    if (param.isRequired) {
      schemaShape[param.nameForForm] = jsonValidator;
    } else {
      schemaShape[param.nameForForm] = jsonValidator
        .optional()
        .transform((val) => (val === "" ? undefined : val));
    }
  });
  return z.object(schemaShape);
};

export function ExecutionJsonBodyDialog({
  isOpen,
  onClose,
  onSubmit,
  parameters,
  onCancel,
}: ExecutionJsonBodyDialogProps) {
  const validationSchema = createValidationSchema(parameters);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(validationSchema),
    mode: "onChange",
    defaultValues: parameters.reduce((acc, param) => {
      acc[param.nameForForm] = "";
      return acc;
    }, {} as FormValues),
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        parameters.reduce((acc, param) => {
          acc[param.nameForForm] = "";
          return acc;
        }, {} as FormValues)
      );
    }
  }, [isOpen, parameters, reset]);

  const processSubmit: SubmitHandler<FormValues> = (data) => {
    const processedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== "") {
        try {
          acc[key] = JSON.parse(value as string);
        } catch {
          acc[key] = value;
        }
      }
      return acc;
    }, {} as FormValues);
    onSubmit(processedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>JSON Body Parameters</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide the JSON body parameters for this workflow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} id="executionJsonBodyForm">
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
                    <Textarea
                      id={param.nameForForm}
                      {...field}
                      value={String(field.value || "")}
                      placeholder={`Enter ${param.label.toLowerCase()} as JSON`}
                      className="w-full font-mono min-h-[200px]"
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
          <AlertDialogCancel onClick={onCancel || onClose}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="submit"
            form="executionJsonBodyForm"
            disabled={!isDirty || !isValid}
          >
            Run Workflow
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
