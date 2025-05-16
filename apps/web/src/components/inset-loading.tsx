import { InsetLayout } from "@/components/layouts/inset-layout";
import { Spinner } from "@/components/ui/spinner";

export function InsetLoading({ title }: { title?: string }) {
  return (
    <InsetLayout title={title} childrenClassName="h-full">
      <div className="flex h-full items-center justify-center gap-2">
        <Spinner className="size-4 text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </InsetLayout>
  );
}
