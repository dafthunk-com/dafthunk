import type { ColumnDef } from "@tanstack/react-table";
import Bot from "lucide-react/icons/bot";
import Hash from "lucide-react/icons/hash";
import MessageCircle from "lucide-react/icons/message-circle";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import Send from "lucide-react/icons/send";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

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
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  deleteDiscordBot,
  useDiscordBots,
} from "@/services/discord-bot-service";
import { deleteSlackBot, useSlackBots } from "@/services/slack-bot-service";
import {
  deleteTelegramBot,
  useTelegramBots,
} from "@/services/telegram-bot-service";
import {
  deleteWhatsAppAccount,
  useWhatsAppAccounts,
} from "@/services/whatsapp-account-service";

import { BotsCreateDialog } from "./bots-create-dialog";

interface BotRow {
  id: string;
  type: "discord" | "telegram" | "whatsapp" | "slack";
  name: string;
  tokenLastFour: string;
  createdAt: string | Date;
}

function createColumns(
  getOrgUrl: (path: string) => string,
  openDeleteDialog: (bot: BotRow) => void
): ColumnDef<BotRow>[] {
  return [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as BotRow["type"];
        const Icon =
          type === "discord"
            ? Bot
            : type === "whatsapp"
              ? MessageCircle
              : type === "slack"
                ? Hash
                : Send;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm capitalize">{type}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const bot = row.original;
        const detailUrl = getOrgUrl(`bots/${bot.type}/${bot.id}`);
        return (
          <Link
            to={detailUrl}
            className="font-medium text-primary hover:underline"
          >
            {bot.name || "Untitled Bot"}
          </Link>
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
                <DropdownMenuItem asChild>
                  <Link to={getOrgUrl(`bots/${bot.type}/${bot.id}`)}>Edit</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(bot)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function BotsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<BotRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const { getOrgUrl } = useOrgUrl();
  const navigate = useNavigate();
  const orgId = organization?.id || "";

  const {
    discordBots,
    discordBotsError,
    isDiscordBotsLoading,
    mutateDiscordBots,
  } = useDiscordBots();

  const {
    telegramBots,
    telegramBotsError,
    isTelegramBotsLoading,
    mutateTelegramBots,
  } = useTelegramBots();

  const { slackBots, slackBotsError, isSlackBotsLoading, mutateSlackBots } =
    useSlackBots();

  const {
    whatsappAccounts,
    whatsappAccountsError,
    isWhatsAppAccountsLoading,
    mutateWhatsAppAccounts,
  } = useWhatsAppAccounts();

  useEffect(() => {
    setBreadcrumbs([{ label: "Bots" }]);
  }, [setBreadcrumbs]);

  const isLoading =
    isDiscordBotsLoading ||
    isTelegramBotsLoading ||
    isSlackBotsLoading ||
    isWhatsAppAccountsLoading;
  const error =
    discordBotsError ||
    telegramBotsError ||
    slackBotsError ||
    whatsappAccountsError;

  const rows: BotRow[] = [
    ...(discordBots || []).map((bot) => ({
      id: bot.id,
      type: "discord" as const,
      name: bot.name,
      tokenLastFour: bot.tokenLastFour,
      createdAt: bot.createdAt,
    })),
    ...(telegramBots || []).map((bot) => ({
      id: bot.id,
      type: "telegram" as const,
      name: bot.name,
      tokenLastFour: bot.tokenLastFour,
      createdAt: bot.createdAt,
    })),
    ...(slackBots || []).map((bot) => ({
      id: bot.id,
      type: "slack" as const,
      name: bot.name,
      tokenLastFour: bot.tokenLastFour,
      createdAt: bot.createdAt,
    })),
    ...(whatsappAccounts || []).map((account) => ({
      id: account.id,
      type: "whatsapp" as const,
      name: account.name,
      tokenLastFour: account.tokenLastFour,
      createdAt: account.createdAt,
    })),
  ];

  const openDeleteDialog = (bot: BotRow) => {
    setBotToDelete(bot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBot = async () => {
    if (!botToDelete || !orgId) return;
    setIsDeleting(true);
    try {
      if (botToDelete.type === "discord") {
        await deleteDiscordBot(botToDelete.id, orgId);
        mutateDiscordBots();
      } else if (botToDelete.type === "slack") {
        await deleteSlackBot(botToDelete.id, orgId);
        mutateSlackBots();
      } else if (botToDelete.type === "whatsapp") {
        await deleteWhatsAppAccount(botToDelete.id, orgId);
        mutateWhatsAppAccounts();
      } else {
        await deleteTelegramBot(botToDelete.id, orgId);
        mutateTelegramBots();
      }
      setDeleteDialogOpen(false);
      setBotToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreated = (
    botId: string,
    type: "discord" | "telegram" | "whatsapp" | "slack"
  ) => {
    mutateDiscordBots();
    mutateTelegramBots();
    mutateSlackBots();
    mutateWhatsAppAccounts();
    setIsCreateDialogOpen(false);
    navigate(getOrgUrl(`bots/${type}/${botId}`));
  };

  const columns = createColumns(getOrgUrl, openDeleteDialog);

  if (isLoading) {
    return <InsetLoading title="Bots" />;
  } else if (error) {
    return <InsetError title="Bots" errorMessage={error.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Bots">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Connect bots to trigger your workflows from chat messages.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Bot
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          emptyState={{
            title: "No bots configured",
            description: "Add a bot to get started.",
          }}
        />
        <BotsCreateDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreated={handleCreated}
        />
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Bot</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "
                {botToDelete?.name || "Untitled Bot"}"? Triggers using this bot
                will need to be reconfigured with a different bot.
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
      </InsetLayout>
    </TooltipProvider>
  );
}
