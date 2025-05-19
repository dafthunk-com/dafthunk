import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import {
  Controller,
  type Resolver,
  SubmitHandler,
  useForm,
} from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";

// Describes the structure of parameters passed to the dialog
export type DialogFormParameter = {
  nodeId: string; // Unique ID of the node
  nameForForm: string; // The key to use in the form data object, e.g., 'customer_email'
  label: string; // User-friendly label for the form input, e.g., "Customer Email"
  nodeName: string; // Original name of the workflow node, for context
  isRequired: boolean; // Whether this parameter is required
  type: string; // Parameter type, e.g., 'parameter-string', 'parameter-number'
};

type ExecutionFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  parameters: DialogFormParameter[];
  onCancel?: () => void;
};

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

// Dynamically builds a Zod validation schema based on the parameters
const createValidationSchema = (parameters: DialogFormParameter[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  parameters.forEach((param) => {
    if (param.type === "parameter-string") {
      let validator: z.ZodTypeAny;
      const stringBase = z.string().trim();

      if (param.isRequired) {
        validator = stringBase.min(1, {
          message: `${param.label} is required.`,
        });
      } else {
        validator = stringBase
          .optional()
          .transform((val) => (val === "" || val === null ? undefined : val));
      }
      schemaShape[param.nameForForm] = validator;
    } else if (param.type === "parameter-number") {
      // Number parameter validation
      let validator: z.ZodTypeAny;

      if (param.isRequired) {
        validator = z.preprocess(
          (val) => (val === "" ? undefined : Number(val)),
          z
            .number({
              invalid_type_error: `${param.label} must be a number`,
            })
            .min(1, {
              message: `${param.label} is required.`,
            })
        );
      } else {
        validator = z.preprocess(
          (val) => (val === "" ? undefined : Number(val)),
          z
            .number({
              invalid_type_error: `${param.label} must be a number`,
            })
            .optional()
        );
      }
      schemaShape[param.nameForForm] = validator;
    } else if (param.type === "parameter-boolean") {
      // Boolean parameter validation
      if (param.isRequired) {
        schemaShape[param.nameForForm] = z.boolean({
          required_error: `${param.label} is required.`,
        });
      } else {
        schemaShape[param.nameForForm] = z.boolean().optional();
      }
    } else if (param.type === "body-json") {
      // JSON parameter validation
      let validator: z.ZodTypeAny;

      if (param.isRequired) {
        validator = z
          .string()
          .min(1, { message: `${param.label} is required.` })
          .refine(isValidJson, {
            message: "Please enter valid JSON",
          })
          .transform((val) => JSON.parse(val));
      } else {
        validator = z
          .string()
          .optional()
          .transform((val) => {
            if (!val || val.trim() === "") return undefined;
            if (!isValidJson(val)) return undefined;
            return JSON.parse(val);
          });
      }
      schemaShape[param.nameForForm] = validator;
    }
  });
  return z.object(schemaShape);
};

export function ExecutionFormDialog({
  isOpen,
  onClose,
  onSubmit,
  parameters,
  onCancel,
}: ExecutionFormDialogProps) {
  const validationSchema = createValidationSchema(parameters);
  type FormValues = Record<string, any>;

  // Check if the form has any required fields
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
    // @ts-ignore: TS2589: Type instantiation is excessively deep and possibly infinite.
    resolver: zodResolver(validationSchema) as unknown as Resolver<FormValues>,
    mode: "onChange", // Validate on change to enable/disable submit button
    defaultValues: parameters.reduce((acc, param) => {
      // Set appropriate default values based on parameter type
      if (param.type.startsWith("parameter-boolean")) {
        acc[param.nameForForm] = false;
      } else if (param.type.startsWith("parameter.json")) {
        acc[param.nameForForm] = ""; // Empty string for JSON
      } else if (param.type.startsWith("parameter-number")) {
        acc[param.nameForForm] = ""; // Empty string for number inputs
      } else {
        acc[param.nameForForm] = ""; // Default for strings
      }
      return acc;
    }, {} as FormValues),
  });

  // Reset form when dialog opens or parameters change
  useEffect(() => {
    if (isOpen) {
      const defaultValues = parameters.reduce((acc, param) => {
        // Set appropriate default values based on parameter type
        if (param.type.startsWith("parameter-boolean")) {
          acc[param.nameForForm] = false;
        } else if (param.type.startsWith("parameter.json")) {
          acc[param.nameForForm] = "";
        } else if (param.type.startsWith("parameter-number")) {
          acc[param.nameForForm] = "";
        } else {
          acc[param.nameForForm] = "";
        }
        return acc;
      }, {} as FormValues);
      reset(defaultValues);
    }
  }, [isOpen, parameters, reset]);

  const processSubmit: SubmitHandler<FormValues> = (data) => {
    // Filter out undefined values before submitting
    const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as FormValues);
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
                  render={({ field }) => {
                    // Render different input components based on parameter type
                    if (param.type.startsWith("parameter-boolean") || param.type.startsWith("parameter-boolean")) {
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
                    } else if (param.type.startsWith("parameter-number") || param.type.startsWith("parameter-number")) {
                      return (
                        <Input
                          id={param.nameForForm}
                          {...field}
                          type="number"
                          placeholder={`Enter ${param.label.toLowerCase()}`}
                          className="w-full"
                        />
                      );
                    } else if (param.type.startsWith("parameter.json") || param.type.startsWith("parameter-json") || param.type === "body-json") {
                      return (
                        <div>
                          <Textarea
                            id={param.nameForForm}
                            {...field}
                            placeholder={`Enter valid JSON, e.g., {"key": "value"}`}
                            className="w-full font-mono text-sm h-32 resize-y"
                          />
                          {!param.isRequired && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Leave empty for no JSON body
                            </p>
                          )}
                        </div>
                      );
                    } else {
                      // Default string input
                      return (
                        <Input
                          id={param.nameForForm}
                          {...field}
                          placeholder={`Enter ${param.label.toLowerCase()}`}
                          className="w-full"
                        />
                      );
                    }
                  }}
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
