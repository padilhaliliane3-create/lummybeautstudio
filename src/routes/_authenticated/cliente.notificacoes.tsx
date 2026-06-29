import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyNotifications,
  markMyNotificationRead,
  markAllMyNotificationsRead,
} from "@/lib/cliente360.functions";
import { formatBrDate } from "@/lib/date";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/notificacoes")({
  component: NotificacoesPage,
});

function NotificacoesPage() {
  const qc = useQueryClient();
  const list = useServerFn(getMyNotifications);
  const markOne = useServerFn(markMyNotificationRead);
  const markAll = useServerFn(markAllMyNotificationsRead);
  const { data, isLoading } = useQuery({ queryKey: ["myNotifs"], queryFn: () => list() });

  async function readOne(id: string) {
    await markOne({ data: { id } });
    qc.invalidateQueries({ queryKey: ["myNotifs"] });
    qc.invalidateQueries({ queryKey: ["myUnread"] });
  }

  async function readAll() {
    await markAll();
    qc.invalidateQueries({ queryKey: ["myNotifs"] });
    qc.invalidateQueries({ queryKey: ["myUnread"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Notificações</h1>
        <button
          onClick={readAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && !data?.length && (
        <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 h-5 w-5" />
          Nenhuma notificação por enquanto.
        </p>
      )}

      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
        {data?.map((n: any) => (
          <li
            key={n.id}
            className={`flex items-start justify-between gap-3 p-4 ${
              n.read_at ? "opacity-70" : ""
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {!n.read_at && <span className="h-2 w-2 rounded-full bg-gold" />}
                <span className="font-medium">{n.title}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {n.kind}
                </span>
              </div>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{formatBrDate(n.created_at)}</p>
            </div>
            {!n.read_at && (
              <button
                onClick={() => readOne(n.id)}
                className="text-xs text-gold hover:underline"
              >
                marcar lida
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
