import { ObjectReference } from "@dafthunk/types";
import {
  AsteriskIcon,
  BoxIcon,
  BracesIcon,
  Building2Icon,
  BuildingIcon,
  CalendarIcon,
  ChartNoAxesGanttIcon,
  CheckIcon,
  DotIcon,
  EllipsisIcon,
  GlobeIcon,
  HashIcon,
  ImageIcon,
  LayoutGridIcon,
  LockIcon,
  MinusIcon,
  MusicIcon,
  ShapesIcon,
  SquareIcon,
  StickyNoteIcon,
  TriangleIcon,
  TypeIcon,
} from "lucide-react";

import { cn } from "@/utils/utils";

import { WorkflowParameter } from "./workflow-types";
import { WorkflowValueRenderer } from "./workflow-value-renderer";

interface WorkflowOutputRendererProps {
  output: WorkflowParameter;
  createObjectUrl: (objectReference: ObjectReference) => string;
  compact?: boolean;
}

const TypeIconRenderer = ({ type }: { type: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    string: <TypeIcon className="!size-2" />,
    number: <HashIcon className="!size-2" />,
    boolean: <CheckIcon className="!size-2" />,
    image: <ImageIcon className="!size-2" />,
    document: <StickyNoteIcon className="!size-2" />,
    audio: <MusicIcon className="!size-2" />,
    buffergeometry: <BoxIcon className="!size-2" />,
    gltf: <BoxIcon className="!size-2" />,
    json: <BracesIcon className="!size-2" />,
    date: <CalendarIcon className="!size-2" />,
    point: <DotIcon className="!size-2" />,
    multipoint: <EllipsisIcon className="!size-2" />,
    linestring: <MinusIcon className="!size-2" />,
    multilinestring: <ChartNoAxesGanttIcon className="!size-2" />,
    polygon: <TriangleIcon className="!size-2" />,
    multipolygon: <ShapesIcon className="!size-2" />,
    geometry: <SquareIcon className="!size-2" />,
    geometrycollection: <LayoutGridIcon className="!size-2" />,
    feature: <BuildingIcon className="!size-2" />,
    featurecollection: <Building2Icon className="!size-2" />,
    geojson: <GlobeIcon className="!size-2" />,
    secret: <LockIcon className="!size-2" />,
    any: <AsteriskIcon className="!size-2" />,
  };

  return iconMap[type] || iconMap.any;
};

export function WorkflowOutputRenderer({
  output,
  createObjectUrl,
  compact = false,
}: WorkflowOutputRendererProps) {
  return (
    <div className="space-y-1.5">
      {/* Output Header */}
      <div className="flex items-center gap-1 text-[0.6rem]">
        <div
          className={cn(
            "inline-flex items-center justify-center size-3.5 flex-shrink-0",
            "rounded-[0.3rem] text-neutral-500 dark:text-neutral-400",
            "bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
          )}
          title={output.type}
        >
          <TypeIconRenderer type={output.type} />
        </div>
        <p className="text-neutral-700 dark:text-neutral-300 truncate font-medium">
          {output.name}
        </p>
      </div>

      {/* Output Value */}
      <WorkflowValueRenderer
        parameter={output}
        createObjectUrl={createObjectUrl}
        compact={compact}
        readonly={true}
      />
    </div>
  );
}
