import type { ObjectReference } from "@dafthunk/types";
import AsteriskIcon from "lucide-react/icons/asterisk";
import BoxIcon from "lucide-react/icons/box";
import BracesIcon from "lucide-react/icons/braces";
import CalendarIcon from "lucide-react/icons/calendar";
import CheckIcon from "lucide-react/icons/check";
import DownloadIcon from "lucide-react/icons/download";
import EyeIcon from "lucide-react/icons/eye";
import EyeOffIcon from "lucide-react/icons/eye-off";
import FileIcon from "lucide-react/icons/file";
import FileTextIcon from "lucide-react/icons/file-text";
import GlobeIcon from "lucide-react/icons/globe";
import HashIcon from "lucide-react/icons/hash";
import ImageIcon from "lucide-react/icons/image";
import LockIcon from "lucide-react/icons/lock";
import MusicIcon from "lucide-react/icons/music";
import TypeIcon from "lucide-react/icons/type";

import { Toggle } from "@/components/ui/toggle";
import { isObjectReference } from "@/services/object-service";

import type { InputOutputType, WorkflowParameter } from "../workflow-types";
import { ClearButton } from "./clear-button";
import { Field } from "./field";
import { UnplugButton } from "./unplug-button";

const getTypeIcon = (type: InputOutputType) => {
  const iconSize = "h-3.5 w-3.5";
  const icons: Record<InputOutputType, React.ReactNode> = {
    string: <TypeIcon className={iconSize} />,
    number: <HashIcon className={iconSize} />,
    boolean: <CheckIcon className={iconSize} />,
    blob: <FileIcon className={iconSize} />,
    image: <ImageIcon className={iconSize} />,
    document: <FileTextIcon className={iconSize} />,
    audio: <MusicIcon className={iconSize} />,
    gltf: <BoxIcon className={iconSize} />,
    json: <BracesIcon className={iconSize} />,
    date: <CalendarIcon className={iconSize} />,
    geojson: <GlobeIcon className={iconSize} />,
    secret: <LockIcon className={iconSize} />,
    any: <AsteriskIcon className={iconSize} />,
  };
  return icons[type] || icons.any;
};

export interface PropertyFieldProps {
  parameter: WorkflowParameter;
  value: unknown;
  onChange: (value: unknown) => void;
  onClear: () => void;
  onDisconnect?: () => void;
  onToggleVisibility: () => void;
  disabled?: boolean;
  connected?: boolean;
  createObjectUrl: (objectReference: ObjectReference) => string;
  autoFocus?: boolean;
}

// File types that support download
const FILE_TYPES: InputOutputType[] = [
  "image",
  "audio",
  "gltf",
  "blob",
  "document",
];

export function PropertyField({
  parameter,
  value,
  onChange,
  onClear,
  onDisconnect,
  onToggleVisibility,
  disabled = false,
  connected = false,
  createObjectUrl,
  autoFocus = false,
}: PropertyFieldProps) {
  // Check if this is a downloadable file type with a value
  const isFileType = FILE_TYPES.includes(parameter.type);
  const hasFileValue = isFileType && isObjectReference(value);
  const downloadUrl = hasFileValue
    ? createObjectUrl(value as ObjectReference)
    : null;

  return (
    <div className="text-sm space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">
            {getTypeIcon(parameter.type)}
          </span>
          <span className="text-foreground font-medium font-mono truncate">
            {parameter.name}
            {parameter.required && (
              <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group px-1 h-8 w-8 flex items-center justify-center"
              title={`Download ${parameter.name}`}
            >
              <DownloadIcon className="h-3 w-3 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
            </a>
          )}
          {connected && onDisconnect ? (
            <UnplugButton
              onClick={onDisconnect}
              label={`Disconnect ${parameter.name}`}
              disabled={disabled}
            />
          ) : (
            value !== undefined && (
              <ClearButton
                onClick={onClear}
                label={`Clear ${parameter.name} value`}
                disabled={disabled}
              />
            )
          )}
          <Toggle
            size="sm"
            pressed={parameter.hidden}
            onPressedChange={onToggleVisibility}
            aria-label={`Toggle visibility for ${parameter.name}`}
            className={`group px-1 h-8 w-8 bg-transparent data-[state=on]:bg-transparent hover:bg-transparent ${
              disabled ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={disabled}
          >
            {parameter.hidden ? (
              <EyeOffIcon className="h-3 w-3 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
            ) : (
              <EyeIcon className="h-3 w-3 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
            )}
          </Toggle>
        </div>
      </div>

      <div className="relative">
        <Field
          parameter={parameter}
          value={value}
          onChange={onChange}
          onClear={onClear}
          disabled={disabled || connected}
          connected={connected}
          createObjectUrl={createObjectUrl}
          className="w-full"
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}
