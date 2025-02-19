import { Button } from "@repo/ui/button";

interface WorkflowControlsProps {
  onAddNode: (e: React.MouseEvent) => void;
  onExecute: (e: React.MouseEvent) => void;
}

export function WorkflowControls({ onAddNode, onExecute }: WorkflowControlsProps) {
  return (
    <>
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddNode(e);
        }}
        size="icon"
        className="absolute bottom-4 right-4 z-50 rounded-full shadow-lg"
        title="Add Node"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </Button>
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onExecute(e);
        }}
        size="icon"
        className="absolute top-4 right-4 z-50 rounded-full shadow-lg"
        title="Execute Workflow"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" 
          />
        </svg>
      </Button>
    </>
  );
} 