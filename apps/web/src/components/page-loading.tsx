import { Spinner } from "@/components/ui/spinner";

export function PageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center h-full w-full">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}
