import type { WorkflowExample } from "@dafthunk/types";
import Check from "lucide-react/icons/check";
import FlaskConical from "lucide-react/icons/flask-conical";
import Pencil from "lucide-react/icons/pencil";
import Save from "lucide-react/icons/save";
import Star from "lucide-react/icons/star";
import Trash2 from "lucide-react/icons/trash-2";
import type { ComponentType } from "react";
import { useState } from "react";

import {
  actionBarButtonBaseClassName,
  actionBarButtonOutlineClassName,
} from "@/components/ui/action-bar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";

interface ExamplePickerProps {
  examples: WorkflowExample[];
  activeId?: string;
  /** Write this example's values onto the canvas and make it active. */
  onApply: (example: WorkflowExample) => void;
  /** Capture the canvas into a new example under this name. */
  onSaveCurrent: (name: string) => void;
  /** Overwrite this example with what is on the canvas now. */
  onUpdate: (example: WorkflowExample) => void;
  onRename: (exampleId: string, name: string) => void;
  onSetDefault: (exampleId: string) => void;
  onDelete: (exampleId: string) => void;
}

/** Open name dialog: creating a new example, or renaming an existing one. */
type NameDraft =
  | { kind: "create" }
  | { kind: "rename"; example: WorkflowExample };

/**
 * Selects and captures examples.
 *
 * Every action that targets one example sits in that example's own row, so the
 * menu never has to say which example it means — the row already did. Only the
 * one action that targets no example (capturing the canvas into a new one) sits
 * in the footer.
 *
 * Deliberately has no input editor of its own: values are edited on the nodes,
 * where the editor already provides a widget for every type, and an example is
 * just a snapshot of them. That is what lets this work unchanged whether a
 * workflow has two inputs or forty.
 */
export function ExamplePicker({
  examples,
  activeId,
  onApply,
  onSaveCurrent,
  onUpdate,
  onRename,
  onSetDefault,
  onDelete,
}: ExamplePickerProps) {
  // Controlled: the row buttons are not menu items, so they have to dismiss the
  // menu themselves before a dialog takes focus.
  const [menuOpen, setMenuOpen] = useState(false);
  const [naming, setNaming] = useState<NameDraft | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleting, setDeleting] = useState<WorkflowExample | null>(null);

  const openNameDialog = (draft: NameDraft) => {
    setDraftName(
      draft.kind === "rename"
        ? draft.example.name
        : `Example ${examples.length + 1}`
    );
    setNaming(draft);
    setMenuOpen(false);
  };

  const submitName = () => {
    const name = draftName.trim();
    if (!naming || !name) return;
    if (naming.kind === "create") {
      onSaveCurrent(name);
    } else {
      onRename(naming.example.id, name);
    }
    setNaming(null);
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        {/* Composed by hand rather than via ActionBarButton, which owns its own
            onClick and cannot forward the trigger props. No wrapper element:
            ActionBarGroup rounds its direct child, which has to be the button. */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  actionBarButtonBaseClassName,
                  actionBarButtonOutlineClassName
                )}
              >
                <FlaskConical className="size-4!" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Examples</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-72">
          {examples.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No examples yet
            </div>
          )}

          {/* The row, not the label, carries the highlight: the icons are part
              of the same line, so a background stopping short of them would
              read as two rows. `focus-within` covers keyboard traversal, which
              lands on the item inside. */}
          {examples.map((example) => (
            <div
              key={example.id}
              className="flex items-center rounded-sm transition-colors focus-within:bg-accent hover:bg-accent"
            >
              <DropdownMenuItem
                className="min-w-0 flex-1 gap-2 focus:bg-transparent"
                onClick={() => onApply(example)}
              >
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    example.id === activeId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span
                  className={cn("truncate", example.isDefault && "font-medium")}
                  title={
                    example.isDefault
                      ? `${example.name} — used by Run when no example is chosen`
                      : example.name
                  }
                >
                  {example.name}
                </span>
              </DropdownMenuItem>

              <div className="flex shrink-0 items-center gap-0.5 px-1">
                {/* Star leads: it is the row's state as much as an action, so
                    it sits next to the name rather than among the verbs. */}
                <RowAction
                  icon={Star}
                  label={
                    example.isDefault
                      ? "Runs by default"
                      : "Use by default when Run names no example"
                  }
                  disabled={example.isDefault}
                  iconClassName={example.isDefault ? "fill-current" : undefined}
                  onClick={() => {
                    onSetDefault(example.id);
                    setMenuOpen(false);
                  }}
                />
                <RowAction
                  icon={Save}
                  label="Update from canvas"
                  onClick={() => {
                    onUpdate(example);
                    setMenuOpen(false);
                  }}
                />
                <RowAction
                  icon={Pencil}
                  label="Rename"
                  onClick={() => openNameDialog({ kind: "rename", example })}
                />
                <RowAction
                  icon={Trash2}
                  label="Delete"
                  onClick={() => {
                    setDeleting(example);
                    setMenuOpen(false);
                  }}
                />
              </div>
            </div>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => openNameDialog({ kind: "create" })}>
            Save canvas as new example…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={naming !== null}
        onOpenChange={(open) => !open && setNaming(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {naming?.kind === "rename" ? "Rename example" : "New example"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitName();
            }}
          >
            <Input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Example name"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNaming(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!draftName.trim()}>
                {naming?.kind === "rename" ? "Rename" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The values saved in this example will be lost. Anything currently
              on the canvas stays as it is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface RowActionProps {
  icon: ComponentType<{ className?: string }>;
  /** Both the tooltip and the accessible name; these buttons carry no text. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  iconClassName?: string;
}

function RowAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  iconClassName,
}: RowActionProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      // No background of its own — the row already highlights, so the icon
      // only has to darken to say which one is under the cursor.
      className="p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className={cn("size-3.5", iconClassName)} />
    </button>
  );
}
