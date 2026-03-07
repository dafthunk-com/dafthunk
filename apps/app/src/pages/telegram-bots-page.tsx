import type { GetTelegramBotResponse } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import ExternalLink from "lucide-react/icons/external-link";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createTelegramBot,
  deleteTelegramBot,
  useTelegramBots,
} from "@/services/telegram-bot-service";

function useTelegramBotActions() {
  const { mutateTelegramBots } = useTelegramBots();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<GetTelegramBotResponse | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBot = async () => {
    if (!botToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteTelegramBot(botToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setBotToDelete(null);
      mutateTelegramBots();
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Telegram Bot</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {botToDelete?.name || "Untitled Bot"}"? Triggers using this bot will
            need to be reconfigured with a different bot.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteBot}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    deleteDialog,
    openDeleteDialog: (bot: GetTelegramBotResponse) => {
      setBotToDelete(bot);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (bot: GetTelegramBotResponse) => void
): ColumnDef<GetTelegramBotResponse>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name || "Untitled Bot"}</span>;
      },
    },
    {
      accessorKey: "botUsername",
      header: "Bot Username",
      cell: ({ row }) => {
        const username = row.getValue("botUsername") as string | null;
        return (
          <span className="text-sm text-muted-foreground">
            {username ? `@${username}` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "tokenLastFour",
      header: "Token",
      cell: ({ row }) => {
        const lastFour = row.getValue("tokenLastFour") as string;
        return (
          <span className="text-sm text-muted-foreground">****{lastFour}</span>
        );
      },
    },
    {
      id: "botLink",
      header: "Link",
      cell: ({ row }) => {
        const username = row.original.botUsername;
        if (!username)
          return <span className="text-sm text-muted-foreground">—</span>;
        const url = `https://t.me/${username}`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            @{username}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bot = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDeleteDialog(bot)}>
                  Delete Bot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function TelegramBotsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const {
    telegramBots,
    telegramBotsError,
    isTelegramBotsLoading,
    mutateTelegramBots,
  } = useTelegramBots();

  const { deleteDialog, openDeleteDialog } = useTelegramBotActions();

  const columns = createColumns(openDeleteDialog);

  useEffect(() => {
    setBreadcrumbs([{ label: "Telegram Bots" }]);
  }, [setBreadcrumbs]);

  const handleCreateBot = async (name: string, botToken: string) => {
    if (!orgHandle) return;
    setIsCreating(true);
    setCreateError(null);

    try {
      await createTelegramBot({ name, botToken }, orgHandle);
      mutateTelegramBots();
      setIsCreateDialogOpen(false);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create bot"
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isTelegramBotsLoading) {
    return <InsetLoading title="Telegram Bots" />;
  } else if (telegramBotsError) {
    return (
      <InsetError
        title="Telegram Bots"
        errorMessage={telegramBotsError.message}
      />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Telegram Bots">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Add your own Telegram bots to use as triggers for workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Telegram Bot
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={telegramBots || []}
          emptyState={{
            title: "No Telegram bots configured",
            description: "Add a Telegram bot to get started.",
          }}
        />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Telegram Bot</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                const botToken = formData.get("botToken") as string;
                await handleCreateBot(name, botToken);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Telegram Bot"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  name="botToken"
                  type="password"
                  placeholder="Enter your Telegram bot token"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from @BotFather on Telegram.
                </p>
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                  Add Bot
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
