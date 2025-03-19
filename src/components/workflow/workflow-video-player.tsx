import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowVideoPlayerProps {
  videoId: string;
  onClose: () => void;
  className?: string;
}

export function WorkflowVideoPlayer({ videoId, onClose, className }: WorkflowVideoPlayerProps) {
  return (
      <div className={className}>
        <iframe
          width="280"
          height="157"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&showinfo=0&rel=0`}
          title="Inspiration Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <Button
          onClick={onClose}
          className="absolute top-1 right-1 z-10 h-6 w-6 p-0 bg-black/50 hover:bg-black/70 rounded-full"
          title="Close Video"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
  );
} 