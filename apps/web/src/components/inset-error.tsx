import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

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
      className="flex flex-1 items-center justify-center h-full w-full text-red-500"
    >
      <p className="mb-2">{errorMessage}</p>
      <Button onClick={handleRetry} className="mt-2">
        Retry
      </Button>
    </InsetLayout>
  );
}
