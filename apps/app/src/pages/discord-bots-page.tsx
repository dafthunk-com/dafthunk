import type { GetDiscordBotResponse } from "@dafthunk/types";
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
  createDiscordBot,
  deleteDiscordBot,
  useDiscordBots,
} from "@/services/discord-bot-service";

function useDiscordBotActions() {
  const { mutateDiscordBots } = useDiscordBots();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<GetDiscordBotResponse | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBot = async () => {
    if (!botToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteDiscordBot(botToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setBotToDelete(null);
      mutateDiscordBots();
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Discord Bot</DialogTitle>
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
    openDeleteDialog: (bot: GetDiscordBotResponse) => {
      setBotToDelete(bot);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (bot: GetDiscordBotResponse) => void
): ColumnDef<GetDiscordBotResponse>[] {
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
      accessorKey: "applicationId",
      header: "Application ID",
      cell: ({ row }) => {
        const appId = row.getValue("applicationId") as string;
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {appId}
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
      id: "inviteUrl",
      header: "Invite",
      cell: ({ row }) => {
        const appId = row.original.applicationId;
        const url = `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot&permissions=2048`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Invite
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

export function DiscordBotsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const {
    discordBots,
    discordBotsError,
    isDiscordBotsLoading,
    mutateDiscordBots,
  } = useDiscordBots();

  const { deleteDialog, openDeleteDialog } = useDiscordBotActions();

  const columns = createColumns(openDeleteDialog);

  useEffect(() => {
    setBreadcrumbs([{ label: "Discord Bots" }]);
  }, [setBreadcrumbs]);

  const handleCreateBot = async (
    name: string,
    botToken: string,
    applicationId: string
  ) => {
    if (!orgHandle) return;
    setIsCreating(true);
    setCreateError(null);

    try {
      await createDiscordBot({ name, botToken, applicationId }, orgHandle);
      mutateDiscordBots();
      setIsCreateDialogOpen(false);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create bot"
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isDiscordBotsLoading) {
    return <InsetLoading title="Discord Bots" />;
  } else if (discordBotsError) {
    return (
      <InsetError
        title="Discord Bots"
        errorMessage={discordBotsError.message}
      />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Discord Bots">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Add your own Discord bots to use as triggers for workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Discord Bot
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={discordBots || []}
          emptyState={{
            title: "No Discord bots configured",
            description: "Add a Discord bot to get started.",
          }}
        />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Discord Bot</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                const botToken = formData.get("botToken") as string;
                const applicationId = formData.get("applicationId") as string;
                await handleCreateBot(name, botToken, applicationId);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Discord Bot"
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
                  placeholder="Enter your Discord bot token"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in the Discord Developer Portal under your
                  application's Bot settings.
                </p>
              </div>
              <div>
                <Label htmlFor="applicationId">Application ID</Label>
                <Input
                  id="applicationId"
                  name="applicationId"
                  placeholder="e.g. 123456789012345678"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Found in your application's General Information page on the
                  Discord Developer Portal.
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
