import type { ObjectReference } from "@dafthunk/types";
import AsteriskIcon from "lucide-react/icons/asterisk";
import BoxIcon from "lucide-react/icons/box";
import BracesIcon from "lucide-react/icons/braces";
import BuildingIcon from "lucide-react/icons/building";
import Building2Icon from "lucide-react/icons/building-2";
import CalendarIcon from "lucide-react/icons/calendar";
import ChartNoAxesGanttIcon from "lucide-react/icons/chart-no-axes-gantt";
import CheckIcon from "lucide-react/icons/check";
import DotIcon from "lucide-react/icons/dot";
import EllipsisIcon from "lucide-react/icons/ellipsis";
import EyeIcon from "lucide-react/icons/eye";
import EyeOffIcon from "lucide-react/icons/eye-off";
import GlobeIcon from "lucide-react/icons/globe";
import HashIcon from "lucide-react/icons/hash";
import ImageIcon from "lucide-react/icons/image";
import LayoutGridIcon from "lucide-react/icons/layout-grid";
import LockIcon from "lucide-react/icons/lock";
import MinusIcon from "lucide-react/icons/minus";
import MusicIcon from "lucide-react/icons/music";
import ShapesIcon from "lucide-react/icons/shapes";
import SquareIcon from "lucide-react/icons/square";
import StickyNoteIcon from "lucide-react/icons/sticky-note";
import TriangleIcon from "lucide-react/icons/triangle";
import TypeIcon from "lucide-react/icons/type";

import { Toggle } from "@/components/ui/toggle";

import { ClearButton } from "./clear-button";
import { Field } from "./field";
import { UnplugButton } from "./unplug-button";
import type { InputOutputType, WorkflowParameter } from "../workflow-types";

const getTypeIcon = (type: InputOutputType) => {
  const iconSize = "h-3.5 w-3.5";
  const icons: Record<InputOutputType, React.ReactNode> = {
    string: <TypeIcon className={iconSize} />,
    number: <HashIcon className={iconSize} />,
    boolean: <CheckIcon className={iconSize} />,
    image: <ImageIcon className={iconSize} />,
    document: <StickyNoteIcon className={iconSize} />,
    audio: <MusicIcon className={iconSize} />,
    buffergeometry: <BoxIcon className={iconSize} />,
    gltf: <BoxIcon className={iconSize} />,
    json: <BracesIcon className={iconSize} />,
    date: <CalendarIcon className={iconSize} />,
    point: <DotIcon className={iconSize} />,
    multipoint: <EllipsisIcon className={iconSize} />,
    linestring: <MinusIcon className={iconSize} />,
    multilinestring: <ChartNoAxesGanttIcon className={iconSize} />,
    polygon: <TriangleIcon className={iconSize} />,
    multipolygon: <ShapesIcon className={iconSize} />,
    geometry: <SquareIcon className={iconSize} />,
    geometrycollection: <LayoutGridIcon className={iconSize} />,
    feature: <BuildingIcon className={iconSize} />,
    featurecollection: <Building2Icon className={iconSize} />,
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
}

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
}: PropertyFieldProps) {
  return (
    <div className="text-sm space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">
            {getTypeIcon(parameter.type)}
          </span>
          <span className="text-foreground font-medium font-mono truncate">
            {parameter.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!disabled && (
            <>
              {connected && onDisconnect ? (
                <UnplugButton
                  onClick={onDisconnect}
                  label={`Disconnect ${parameter.name}`}
                />
              ) : (
                value !== undefined && (
                  <ClearButton
                    onClick={onClear}
                    label={`Clear ${parameter.name} value`}
                  />
                )
              )}
            </>
          )}
          <Toggle
            size="sm"
            pressed={parameter.hidden}
            onPressedChange={onToggleVisibility}
            aria-label={`Toggle visibility for ${parameter.name}`}
            className={`group px-1 h-8 w-8 bg-transparent data-[state=on]:bg-transparent hover:bg-transparent transition-colors ${
              disabled ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={disabled}
          >
            {parameter.hidden ? (
              <EyeOffIcon className="h-3 w-3 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" />
            ) : (
              <EyeIcon className="h-3 w-3 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" />
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
        />
      </div>
    </div>
  );
}
