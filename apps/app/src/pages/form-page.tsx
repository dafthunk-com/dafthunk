import Check from "lucide-react/icons/check";
import Loader2 from "lucide-react/icons/loader-2";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl } from "@/config/api";

// ── Types ───────────────────────────────────────────────────────────────

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  label?: string;
  defaultValue?: string;
}

interface FormConfig {
  title: string;
  description?: string;
  fields: SchemaField[];
  submitted: boolean;
}

type FormState =
  | { status: "loading" }
  | { status: "ready"; config: FormConfig }
  | { status: "submitting"; config: FormConfig }
  | { status: "success" }
  | { status: "already_submitted" }
  | { status: "error"; message: string };

// ── Schema Field Renderer ───────────────────────────────────────────────

function SchemaFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const displayLabel = field.label || field.name;

  switch (field.type) {
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <Switch
            id={field.name}
            checked={!!value}
            onCheckedChange={onChange}
            disabled={disabled}
          />
          <Label htmlFor={field.name}>{displayLabel}</Label>
        </div>
      );

    case "number":
    case "integer":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={field.name}
            type="number"
            step={field.type === "integer" ? "1" : "any"}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                onChange(undefined);
              } else {
                onChange(
                  field.type === "integer" ? parseInt(v, 10) : parseFloat(v)
                );
              }
            }}
            disabled={disabled}
          />
        </div>
      );

    case "datetime":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={field.name}
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            disabled={disabled}
          />
        </div>
      );

    case "json":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={field.name}
            placeholder="Enter JSON..."
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            rows={3}
            className="font-mono text-sm"
            disabled={disabled}
          />
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={field.name}>
            {displayLabel}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={field.name}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            disabled={disabled}
          />
        </div>
      );
  }
}

// ── Form Page ───────────────────────────────────────────────────────────

/**
 * Public form page for human-in-the-loop workflow input.
 * No authentication required — the signed token in the URL IS the authorization.
 */
export function FormPage() {
  const { signedToken } = useParams<{ signedToken: string }>();
  const [state, setState] = useState<FormState>({ status: "loading" });
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!signedToken) {
      setState({ status: "error", message: "Invalid form link" });
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    fetch(`${apiBaseUrl}/forms/${signedToken}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Failed to load form"
          );
        }
        return res.json();
      })
      .then((config: FormConfig) => {
        if (config.submitted) {
          setState({ status: "already_submitted" });
        } else {
          const defaults: Record<string, unknown> = {};
          for (const f of config.fields) {
            if (f.defaultValue !== undefined) {
              defaults[f.name] = f.defaultValue;
            }
          }
          setValues(defaults);
          setState({ status: "ready", config });
        }
      })
      .catch((err: Error) => {
        setState({ status: "error", message: err.message });
      });
  }, [signedToken]);

  const handleSubmit = useCallback(async () => {
    if (state.status !== "ready") return;

    setState({ status: "submitting", config: state.config });

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/forms/${signedToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error =
          (data as { error?: string }).error || "Failed to submit form";
        if (res.status === 409) {
          setState({ status: "already_submitted" });
        } else {
          setState({ status: "error", message: error });
        }
        return;
      }

      setState({ status: "success" });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to submit form",
      });
    }
  }, [state, signedToken, values]);

  const isSubmitting = state.status === "submitting";

  const config =
    state.status === "ready" || state.status === "submitting"
      ? state.config
      : null;

  const isValid = config
    ? config.fields
        .filter((f) => f.required)
        .every((f) => {
          const v = values[f.name];
          return v !== undefined && v !== null && v !== "";
        })
    : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        {state.status === "loading" && (
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        )}

        {state.status === "error" && (
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
        )}

        {state.status === "already_submitted" && (
          <CardHeader>
            <CardTitle>Already Submitted</CardTitle>
            <CardDescription>
              This form has already been completed. No further action is needed.
            </CardDescription>
          </CardHeader>
        )}

        {state.status === "success" && (
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle>Response Submitted</CardTitle>
            <CardDescription>
              Thank you. Your response has been recorded and the workflow will
              continue.
            </CardDescription>
          </CardHeader>
        )}

        {config && (
          <>
            <CardHeader>
              <CardTitle>{config.title}</CardTitle>
              {config.description && (
                <CardDescription>{config.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {config.fields.map((field) => (
                <SchemaFieldInput
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [field.name]: value }))
                  }
                  disabled={isSubmitting}
                />
              ))}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={isSubmitting || !isValid}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Submit
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
