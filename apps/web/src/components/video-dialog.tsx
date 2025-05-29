import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

interface VideoDialogProps {
  videoId: string;
  children: React.ReactNode;
}

export function VideoDialog({ videoId, children }: VideoDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="fixed left-[50%] top-[50%] z-[52] grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-1 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:max-w-[900px]">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <AlertDialogCancel className="absolute -right-16 -top-16 p-0 border-0 bg-transparent hover:bg-transparent [&>svg]:w-12 [&>svg]:h-12">
            <X className="text-white/80 hover:text-white" style={{ width: '2rem', height: '2rem' }} />
          </AlertDialogCancel>
          {open && (
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${videoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
} 