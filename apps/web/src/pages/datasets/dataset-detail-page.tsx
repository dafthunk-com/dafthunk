import { useEffect } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDataset } from "@/services/dataset-service";

export function DatasetDetailPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const {
    dataset,
    datasetError,
    isDatasetLoading,
  } = useDataset(datasetId || null);

  useEffect(() => {
    if (datasetId) {
      setBreadcrumbs([
        { label: "Datasets", to: "/datasets/datasets" },
        { label: dataset?.name || datasetId },
      ]);
    }
  }, [datasetId, dataset?.name, setBreadcrumbs]);

  useEffect(() => {
    if (datasetError) {
      toast.error(
        `Failed to fetch dataset details: ${datasetError.message}`
      );
    }
  }, [datasetError]);

  if (isDatasetLoading) {
    return <InsetLoading title="Dataset Details" />;
  } else if (datasetError) {
    return (
      <InsetError
        title="Dataset Details"
        errorMessage={datasetError.message}
      />
    );
  }

  if (!dataset) {
    return (
      <InsetLayout title="Dataset Not Found">
        <div className="text-center py-10">
          <p className="text-lg">Dataset not found or an error occurred.</p>
        </div>
      </InsetLayout>
    );
  }

  return (
    <InsetLayout title={dataset.name}>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h3 className="font-semibold leading-none tracking-tight mb-4">Dataset Information</h3>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-muted-foreground">Name:</span>
            <p className="font-medium">{dataset.name}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Handle:</span>
            <p className="font-mono text-sm">{dataset.handle}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Created:</span>
            <p className="font-medium">{new Date(dataset.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Last Updated:</span>
            <p className="font-medium">{new Date(dataset.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </InsetLayout>
  );
} 