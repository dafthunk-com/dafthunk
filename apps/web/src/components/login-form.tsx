import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
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
    <div
      className={cn("flex flex-col gap-6 max-w-4xl mx-auto", className)}
      {...props}
    >
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8 flex items-center">
            <div className="flex flex-col gap-8 w-full py-8">
              <a
                href="#"
                className="flex items-center gap-2 self-center font-medium"
              >
                <img
                  src="/logo.svg"
                  alt="dafthunk"
                  className="h-16 dark:invert"
                />
              </a>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">
                  Workflows no one asked for
                </h1>
                <p className="text-balance text-muted-foreground mt-2">
                  Break it, fix it, prompt it, automatic, automatic, ...
                </p>
              </div>
              <div className="flex flex-col gap-4 w-full">
                <Button
                  onClick={() => handleLoginClick("google")}
                  className="w-full py-6"
                  size="lg"
                >
                  <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 mr-2" />
                  Sign in with Google
                </Button>
                <Button
                  onClick={() => handleLoginClick("github")}
                  className="w-full py-6"
                  size="lg"
                >
                  <FontAwesomeIcon icon={faGithub} className="w-5 h-5 mr-2" />
                  Sign in with GitHub
                </Button>
              </div>
            </div>
          </div>
          <div className="relative hidden md:block h-[600px] bg-muted">
            <img
              src="/dafthunk-light.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:hidden"
            />
            <img
              src="/dafthunk-dark.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover hidden dark:block"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By signing in, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
