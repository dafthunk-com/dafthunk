import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router";

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
            <Link
              to="/"
              className="flex items-center gap-2 self-center font-medium"
            >
              <img
                src="/logo.svg"
                alt="dafthunk"
                className="h-16 dark:invert"
              />
            </Link>
          </CardTitle>
          <CardDescription>
            Break it, fix it, prompt it, automatic, automatic, ...
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
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By signing in, you agree to our{" "}
        <Link to="/terms-of-service">Terms of Service</Link> and{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>.
      </div>
    </div>
  );
}
