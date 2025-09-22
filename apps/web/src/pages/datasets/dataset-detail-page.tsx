import { DatasetFile } from "@dafthunk/types";
import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  deleteDatasetFile,
  downloadDatasetFile,
  uploadDatasetFiles,
  useDataset,
  useDatasetFiles,
} from "@/services/dataset-service";

export function DatasetDetailPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { dataset, datasetError, isDatasetLoading } = useDataset(
    datasetId || null
  );

  const { files, filesError, isFilesLoading, mutateFiles } = useDatasetFiles(
    datasetId || null
  );

  useEffect(() => {
    if (datasetId) {
      setBreadcrumbs([
        { label: "Datasets", to: "/org/datasets" },
        { label: dataset?.name || datasetId },
      ]);
    }
  }, [datasetId, dataset?.name, setBreadcrumbs]);

  useEffect(() => {
    if (datasetError) {
      toast.error(`Failed to fetch dataset details: ${datasetError.message}`);
    }
  }, [datasetError]);

  useEffect(() => {
    if (filesError) {
      toast.error(`Failed to fetch dataset files: ${filesError.message}`);
    }
  }, [filesError]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || !datasetId || !organization?.handle) return;

    // Convert FileList to array
    const fileArray = Array.from(files);

    try {
      const result = await uploadDatasetFiles(
        datasetId,
        fileArray,
        organization.handle
      );

      // Show success message for successful uploads
      if (result.success.length > 0) {
        if (result.success.length === 1) {
          toast.success(`File "${result.success[0]}" uploaded successfully`);
        } else {
          toast.success(`${result.success.length} files uploaded successfully`);
        }
      }

      // Show error messages for failed uploads
      if (result.errors.length > 0) {
        result.errors.forEach(({ file, error }) => {
          toast.error(`Failed to upload "${file}": ${error}`);
        });
      }

      mutateFiles();
    } catch (error) {
      toast.error("Failed to upload files");
      console.error("Upload error:", error);
    }
  };

  const handleFileDelete = async (file: DatasetFile) => {
    if (!datasetId || !organization?.handle) return;

    try {
      await deleteDatasetFile(
        datasetId,
        file.key.split("/").pop() || "",
        organization.handle
      );
      toast.success("File deleted successfully");
      mutateFiles();
    } catch (error) {
      toast.error("Failed to delete file");
      console.error("Delete error:", error);
    }
  };

  const handleFileDownload = async (file: DatasetFile) => {
    if (!datasetId || !organization?.handle) return;

    try {
      await downloadDatasetFile(
        datasetId,
        file.key.split("/").pop() || "",
        organization.handle
      );
    } catch (error) {
      toast.error("Failed to download file");
      console.error("Download error:", error);
    }
  };

  if (isDatasetLoading) {
    return <InsetLoading title="Dataset Details" />;
  } else if (datasetError) {
    return (
      <InsetError title="Dataset Details" errorMessage={datasetError.message} />
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
      <div className="space-y-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold leading-none tracking-tight mb-4">
            Dataset Information
          </h3>
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
              <p className="font-medium">
                {new Date(dataset.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Last Updated:
              </span>
              <p className="font-medium">
                {new Date(dataset.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold leading-none tracking-tight">
                Files
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select multiple files to upload at once
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                multiple
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Upload Files
              </Button>
            </div>
          </div>

          {isFilesLoading ? (
            <div className="text-center py-4">Loading files...</div>
          ) : filesError ? (
            <div className="text-center py-4 text-destructive">
              Failed to load files
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No files uploaded yet</p>
              <p className="text-xs mt-1">
                You can select multiple files at once
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.key.split("/").pop()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.uploaded).toLocaleString()} •{" "}
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDownload(file)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDelete(file)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </InsetLayout>
  );
}
