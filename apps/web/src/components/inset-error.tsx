import { useNavigate } from "react-router-dom";

import { InsetLayout } from "@/components/layouts/inset-layout";

import { Button } from "./ui/button";

interface InsetErrorProps {
  title?: string;
  errorMessage: string;
}

export function InsetError({ title, errorMessage }: InsetErrorProps) {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate(0); // This will refresh the current page
  };

  return (
    <InsetLayout
      title={title}
      className="overflow-hidden h-full"
      titleClassName="mb-0 relative"
      childrenClassName="flex flex-col flex-1 items-center justify-center h-full w-full text-center text-red-500 p-0"
    >
      <p className="mb-2 max-w-md">{errorMessage}</p>
      <Button onClick={handleRetry} className="mt-2">
        Retry
      </Button>
    </InsetLayout>
  );
}
