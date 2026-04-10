import Check from "lucide-react/icons/check";
import Loader2 from "lucide-react/icons/loader-2";
import X from "lucide-react/icons/x";
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
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl } from "@/config/api";

interface FormConfig {
  prompt: string;
  context?: string;
  inputType: string;
  submitted: boolean;
}

type FormState =
  | { status: "loading" }
  | { status: "ready"; config: FormConfig }
  | { status: "submitting"; config: FormConfig }
  | { status: "success" }
  | { status: "already_submitted" }
  | { status: "error"; message: string };

/**
 * Public form page for human-in-the-loop workflow input.
 * No authentication required — the signed token in the URL IS the authorization.
 */
export function FormPage() {
  const { signedToken } = useParams<{ signedToken: string }>();
  const [state, setState] = useState<FormState>({ status: "loading" });
  const [textValue, setTextValue] = useState("");

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
          setState({ status: "ready", config });
        }
      })
      .catch((err: Error) => {
        setState({ status: "error", message: err.message });
      });
  }, [signedToken]);

  const handleSubmit = useCallback(
    async (body: {
      text?: string;
      approved?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      if (state.status !== "ready") return;

      setState({ status: "submitting", config: state.config });

      try {
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(`${apiBaseUrl}/forms/${signedToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
          message:
            err instanceof Error ? err.message : "Failed to submit form",
        });
      }
    },
    [state, signedToken]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        {state.status === "loading" && (
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        )}

        {state.status === "error" && (
          <>
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
          </>
        )}

        {state.status === "already_submitted" && (
          <>
            <CardHeader>
              <CardTitle>Already Submitted</CardTitle>
              <CardDescription>
                This form has already been completed. No further action is
                needed.
              </CardDescription>
            </CardHeader>
          </>
        )}

        {state.status === "success" && (
          <>
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
          </>
        )}

        {(state.status === "ready" || state.status === "submitting") && (
          <>
            <CardHeader>
              <CardTitle>{state.config.prompt}</CardTitle>
              {state.config.context && (
                <CardDescription>{state.config.context}</CardDescription>
              )}
            </CardHeader>

            {state.config.inputType === "approve" ? (
              <CardFooter className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={state.status === "submitting"}
                  onClick={() => handleSubmit({ approved: false })}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  disabled={state.status === "submitting"}
                  onClick={() => handleSubmit({ approved: true })}
                >
                  {state.status === "submitting" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
              </CardFooter>
            ) : (
              <>
                <CardContent>
                  <Textarea
                    placeholder="Type your response..."
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    rows={4}
                    disabled={state.status === "submitting"}
                  />
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={
                      state.status === "submitting" || !textValue.trim()
                    }
                    onClick={() => handleSubmit({ text: textValue.trim() })}
                  >
                    {state.status === "submitting" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Submit
                  </Button>
                </CardFooter>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
