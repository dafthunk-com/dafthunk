import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InspirationVideoProps {
  videoId: string;
  onClose: () => void;
  className?: string;
}

function InspirationVideo({
  videoId,
  onClose,
  className,
}: InspirationVideoProps) {
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

const INSPIRATION_VIDEO_IDS = ["K0HSD_i2DvA", "D8K90hX4PrE"];

interface InspirationProps {
  className?: string;
}

export function Inspiration({ className }: InspirationProps) {
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  return (
    <div className={className}>
      {!isVideoVisible && (
        <Button
          onClick={() => setIsVideoVisible(true)}
          className="absolute bottom-6 left-6 z-50 rounded-full shadow-lg h-10 w-10 p-0 bg-amber-500 hover:bg-amber-600"
          title="Show Inspiration"
        >
          <Lightbulb className="w-6 h-6" />
        </Button>
      )}

      {isVideoVisible && (
        <InspirationVideo
          className="absolute bottom-4 left-4 z-50 shadow-lg rounded-md overflow-hidden bg-black"
          videoId={
            INSPIRATION_VIDEO_IDS[
              Math.floor(Math.random() * INSPIRATION_VIDEO_IDS.length)
            ]
          }
          onClose={() => setIsVideoVisible(false)}
        />
      )}
    </div>
  );
}
