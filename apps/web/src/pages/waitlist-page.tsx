import { Clock, Mail, Users } from "lucide-react";
import { Link } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { CONTACT_EMAIL } from "@/utils/constants";

export function WaitlistPage() {
  usePageBreadcrumbs([{ label: "Waitlist" }]);

  const { user, logout } = useAuth();

  return (
    <main className="flex items-center justify-center min-h-full">
      <div className="w-full max-w-lg border rounded-lg bg-card shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-semibold">You're on the waitlist!</h1>
          <p className="text-muted-foreground mt-2">
            Thank you for your interest in Dafthunk. We're working hard to get
            you access soon.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-shrink-0 h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Early Access</h3>
                <p className="text-sm text-muted-foreground">
                  We're gradually rolling out access to ensure the best
                  experience for everyone.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex flex-shrink-0 h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium">We'll Notify You</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.email
                    ? `We'll send an email to ${user.email} when your access is ready.`
                    : "We'll notify you as soon as your access is ready."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link to="/docs">Explore Documentation</Link>
              </Button>

              <Button variant="outline" onClick={logout} className="flex-1">
                Sign Out
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Questions? Contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-foreground hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
