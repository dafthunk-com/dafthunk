import { ChevronLeft } from "lucide-react";
import { ReactNode } from "react";
import { useNavigate } from "react-router";

import { cn } from "@/utils/utils";

import { Logo } from "../logo";

interface ContentLayoutProps {
  title: string;
  children: ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-screen-md flex-col p-8 lg:px-12 lg:py-16">
      <button
        type="button"
        className={cn(
          "mb-10 flex items-center gap-0.5 font-bold text-muted-foreground transition-colors hover:text-foreground"
        )}
        onClick={handleBack}
      >
        <ChevronLeft className="inline h-5 w-5 *:!stroke-inherit" />
        Back
      </button>
      <h1 className="mb-4 text-3xl font-bold">{title}</h1>
      <section className="md mb-12 text-justify">{children}</section>
      <div className="flex w-full justify-center">
        <a href="/" aria-label="Dafthunk Homepage">
          <Logo />
        </a>
      </div>
    </div>
  );
}
