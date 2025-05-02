import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <InsetLayout className="grid place-items-center h-full">
      <div className="flex flex-col items-center justify-center">
        <img src="/404.svg" alt="404" className="h-32 mb-8 dark:invert" />
        <h2 className="text-xl font-semibold mb-4">
          Whoops! Looks like you took a wrong turn.
        </h2>
        <p className="text-muted-foreground mb-8">
          Maybe this page went 'Around the World' and couldn't find its way
          back. Let's get you home.
        </p>
        <Button asChild>
          <Link to="/">Beam me back Home</Link>
        </Button>
      </div>
    </InsetLayout>
  );
}
