import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Describes the structure of parameters passed to the dialog
export type DialogFormParameter = {
  nodeId: string; // Unique ID of the node
  nameForForm: string; // The key to use in the form data object, e.g., 'customer_email'
  label: string; // User-friendly label for the form input, e.g., "Customer Email"
  nodeName: string; // Original name of the workflow node, for context
  isRequired: boolean; // Whether this parameter is required
  type:
    | "form-data-string"
    | "form-data-number"
    | "form-data-boolean"
    | "body-json"; // Parameter type, e.g., 'form-data-string', 'form-data-number'
};

type ExecutionFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  parameters: DialogFormParameter[];
  onCancel?: () => void;
};

type FormValues = Record<string, any>;

// Validation schema creators
const createStringValidator = (param: DialogFormParameter): z.ZodTypeAny => {
  const stringBase = z.string().trim();
  return param.isRequired
    ? stringBase.min(1, { message: `${param.label} is required.` })
    : stringBase
        .optional()
        .transform((val) => (val === "" || val === null ? undefined : val));
};

const createNumberValidator = (param: DialogFormParameter): z.ZodTypeAny => {
  const numberBase = z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: `${param.label} must be a number` })
  );
  return param.isRequired
    ? numberBase.refine((val) => val >= 1, {
        message: `${param.label} is required.`,
      })
    : numberBase.optional();
};

const createBooleanValidator = (param: DialogFormParameter): z.ZodTypeAny => {
  return param.isRequired
    ? z.boolean({ required_error: `${param.label} is required.` })
    : z.boolean().optional();
};

const createValidationSchema = (parameters: DialogFormParameter[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  parameters.forEach((param) => {
    switch (param.type) {
      case "form-data-string":
        schemaShape[param.nameForForm] = createStringValidator(param);
        break;
      case "form-data-number":
        schemaShape[param.nameForForm] = createNumberValidator(param);
        break;
      case "form-data-boolean":
        schemaShape[param.nameForForm] = createBooleanValidator(param);
        break;
    }
  });
  return z.object(schemaShape);
};

// Form input component
const FormInput = ({
  param,
  field,
}: {
  param: DialogFormParameter;
  field: any;
}) => {
  switch (param.type) {
    case "form-data-boolean":
      return (
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id={param.nameForForm}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
          <label
            htmlFor={param.nameForForm}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {field.value ? "Yes" : "No"}
          </label>
        </div>
      );
    case "form-data-number":
      return (
        <Input
          id={param.nameForForm}
          {...field}
          type="number"
          placeholder={`Enter ${param.label.toLowerCase()}`}
          className="w-full"
        />
      );
    default:
      return (
        <Input
          id={param.nameForForm}
          {...field}
          placeholder={`Enter ${param.label.toLowerCase()}`}
          className="w-full"
        />
      );
  }
};

// Get default form values
const getDefaultFormValues = (
  parameters: DialogFormParameter[]
): FormValues => {
  return parameters.reduce((acc, param) => {
    acc[param.nameForForm] = param.type === "form-data-boolean" ? false : "";
    return acc;
  }, {} as FormValues);
};

export function ExecutionFormDialog({
  isOpen,
  onClose,
  onSubmit,
  parameters,
  onCancel,
}: ExecutionFormDialogProps) {
  const validationSchema = createValidationSchema(parameters);
  const hasRequiredFields = useMemo(
    () => parameters.some((param) => param.isRequired),
    [parameters]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(validationSchema),
    mode: "onChange",
    defaultValues: getDefaultFormValues(parameters),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultFormValues(parameters));
    }
  }, [isOpen, parameters, reset]);

  const processSubmit: SubmitHandler<FormValues> = (data) => {
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    onSubmit(filteredData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Workflow Execution Parameters</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide the required parameters to run this workflow.
            {!hasRequiredFields && (
              <span className="block mt-1 text-sm">
                All fields are optional. You can run the workflow without
                providing any parameters.
              </span>
            )}
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
                    <FormInput param={param} field={field} />
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
            form="executionParamsForm"
            disabled={hasRequiredFields ? !isDirty || !isValid : !isValid}
          >
            Run Workflow
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
