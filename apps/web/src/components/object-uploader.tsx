import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ObjectReference, ObjectMetadata } from "@dafthunk/types";
import { useObjectService } from "@/services/objectService";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Upload, Trash2 } from "lucide-react";

export interface ObjectUploaderProps {
  onObjectSelected?: (reference: ObjectReference) => void;
  acceptTypes?: string;
  label?: string;
}

export default function ObjectUploader({
  onObjectSelected,
  acceptTypes = "image/*",
  label = "Upload File",
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedObjects, setUploadedObjects] = useState<ObjectMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { uploadBinaryData, createObjectUrl, listObjects, deleteObject } =
    useObjectService();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      const buffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(
        new Uint8Array(buffer),
        file.type
      );

      if (onObjectSelected) {
        onObjectSelected(reference);
      }

      // Refresh the list of objects
      const objects = await listObjects();
      setUploadedObjects(objects);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      // Clear the input to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteObject = async (objectId: string, mimeType: string) => {
    try {
      const success = await deleteObject(objectId, mimeType);
      if (success) {
        // Remove from the list
        setUploadedObjects((prev) => prev.filter((obj) => obj.id !== objectId));
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const loadObjects = async () => {
    try {
      setError(null);
      const objects = await listObjects();
      setUploadedObjects(objects);
    } catch (err) {
      console.error("Error loading objects:", err);
      setError(err instanceof Error ? err.message : "Failed to load objects");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={acceptTypes}
          onChange={handleFileChange}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {label}
          </Button>
          <Button variant="outline" onClick={loadObjects}>
            Refresh List
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {uploadedObjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedObjects.map((object) => (
            <Card key={object.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <CardTitle className="text-sm truncate">{object.id}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {object.mimeType.startsWith("image/") ? (
                  <img
                    src={createObjectUrl({
                      id: object.id,
                      mimeType: object.mimeType,
                    })}
                    alt={object.id}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <p className="text-sm text-gray-500">{object.mimeType}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {new Date(object.createdAt).toLocaleDateString()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteObject(object.id, object.mimeType)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
