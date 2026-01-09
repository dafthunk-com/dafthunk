import { faGithub, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/utils/utils";

import { useAuth } from "./auth-context";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { login } = useAuth();

  const handleLoginClick = async (provider: "github" | "google") => {
    await login(provider);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex justify-center">
            <a href="/" className="flex items-center gap-3">
              <img
                src="/icon.svg"
                alt="Dafthunk"
                className="h-8 w-8 dark:invert"
              />
              <span className="text-2xl font-semibold text-foreground">
                dafthunk
              </span>
            </a>
          </CardTitle>
          <CardDescription>
            Build and deploy serverless workflows visually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <Button
                onClick={() => handleLoginClick("google")}
                variant="outline"
                className="w-full"
              >
                <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 mr-2" />
                Login with Google
              </Button>
              <Button
                onClick={() => handleLoginClick("github")}
                variant="outline"
                className="w-full"
              >
                <FontAwesomeIcon icon={faGithub} className="w-5 h-5 mr-2" />
                Login with GitHub
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground">
        By signing up, you agree to our{" "}
        <a
          href={`${import.meta.env.VITE_WEBSITE_URL}/terms`}
          className="underline hover:text-gray-700"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href={`${import.meta.env.VITE_WEBSITE_URL}/privacy`}
          className="underline hover:text-gray-700"
        >
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
