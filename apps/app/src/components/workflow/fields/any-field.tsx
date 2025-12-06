import { isObjectReference } from "@/services/object-service";

import { BlobField } from "./blob-field";
import { BooleanField } from "./boolean-field";
import { JsonField } from "./json-field";
import { NumberField } from "./number-field";
import { TextField } from "./text-field";
import type { FieldProps, ObjectReference } from "./types";

// AnyField is always read-only - it displays values of any type
export function AnyField({
  className,
  connected,
  createObjectUrl,
  parameter,
  value,
}: Pick<FieldProps, "className" | "connected" | "parameter" | "value"> & {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}) {
  const noop = () => {};

  // Any field accepts any type, so null and undefined are both considered "no value"
  const hasValue = value !== undefined && value !== null;

  // Object references (files) - delegate to BlobField
  if (hasValue && isObjectReference(value)) {
    return (
      <BlobField
        className={className}
        connected={connected}
        createObjectUrl={createObjectUrl}
        disabled
        onFileUpload={async () => {}}
        onChange={noop}
        onClear={noop}
        parameter={parameter}
        value={value}
      />
    );
  }

  // Objects and arrays - delegate to JsonField
  if (hasValue && (Array.isArray(value) || typeof value === "object")) {
    return (
      <JsonField
        className={className}
        connected={connected}
        disabled
        onChange={noop}
        onClear={noop}
        parameter={parameter}
        value={value}
      />
    );
  }

  // Booleans - delegate to BooleanField
  if (typeof value === "boolean") {
    return (
      <BooleanField
        className={className}
        connected={connected}
        disabled
        onChange={noop}
        onClear={noop}
        parameter={parameter}
        value={value}
      />
    );
  }

  // Numbers - delegate to NumberField
  if (typeof value === "number") {
    return (
      <NumberField
        className={className}
        connected={connected}
        disabled
        onChange={noop}
        onClear={noop}
        parameter={parameter}
        value={value}
      />
    );
  }

  // Strings and everything else - delegate to TextField
  return (
    <TextField
      className={className}
      connected={connected}
      disabled
      onChange={noop}
      onClear={noop}
      parameter={parameter}
      value={value}
    />
  );
}
