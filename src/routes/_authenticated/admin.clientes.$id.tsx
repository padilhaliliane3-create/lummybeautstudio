import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Upload, Send, Image as ImageIcon, FileText, Bell, History as HistoryIcon, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminGetClient,
  adminGetAnamnesis,
  adminSaveAnamnesis,
  adminListPhotos,
  adminAddPhoto,
  adminDeletePhoto,
  adminListNotifications,
  adminCreateNotification,
  adminDeleteNotification,
} from "@/lib/cliente360.functions";
import { adminGetClientHistory } from "@/lib/clients.functions";
import { formatBrDateOnly, formatBrTime, formatBrDate } from "@/lib/date";
import { formatBrFromE164 } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  component: ClientProfilePage,
});

type Tab = "anamnese" | "evolucao" | "notificacoes" | "historico";

function ClientProfilePage() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetClient);
  const { data: client, isLoading } = useQuery({
    queryKey: ["adminClient", id],
    queryFn: () => get({ data: { id } }),
  });
  const [tab, setTab] = useState<Tab>("anamnese");

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!client) return <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "anamnese", label: "Anamnese", icon: FileText },
    { key: "evolucao", label: "Evolução", icon: ImageIcon },
    { key: "notificacoes", label: "Notificações", icon: Bell },
    { key: "historico", label: "Histórico", icon: HistoryIcon },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Link to="/admin/clientes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="font-display text-2xl text-foreground">{client.name}</h2>
          <p className="text-xs text-muted-foreground">
            {formatBrFromE164(client.whatsapp)} {client.email ? `· ${client.email}` : ""}
          </p>
        </div>
        <Link
          to={`/admin/clientes/${id}/cronograma` as any}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Cronograma
        </Link>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border/60">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition ${
                active
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "anamnese" && <AnamneseTab clientId={id} />}
      {tab === "evolucao" && <EvolucaoTab clientId={id} />}
      {tab === "notificacoes" && <NotificacoesTab clientId={id} />}
      {tab === "historico" && <HistoricoTab clientId={id} />}
    </div>
  );
}

/* ---------- Anamnese ---------- */

function AnamneseTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const get = useServerFn(adminGetAnamnesis);
  const save = useServerFn(adminSaveAnamnesis);
  const { data, isLoading } = useQuery({
    queryKey: ["anamnesis", clientId],
    queryFn: () => get({ data: { clientId } }),
  });
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const current = { ...(data ?? {}), ...form };

  function set(k: string, v: string) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { client_id: clientId, ...current } });
      toast.success("Anamnese salva.");
      setForm({});
      qc.invalidateQueries({ queryKey: ["anamnesis", clientId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const fields: { k: string; label: string; long?: boolean }[] = [
    { k: "hair_type", label: "Tipo de cabelo" },
    { k: "hair_chemistry", label: "Química / coloração", long: true },
    { k: "hair_treatments", label: "Tratamentos recentes", long: true },
    { k: "scalp_condition", label: "Condição do couro cabeludo", long: true },
    { k: "nail_condition", label: "Condição das unhas", long: true },
    { k: "allergies", label: "Alergias", long: true },
    { k: "medications", label: "Medicações em uso", long: true },
    { k: "health_conditions", label: "Condições de saúde", long: true },
    { k: "preferences", label: "Preferências da cliente", long: true },
    { k: "notes", label: "Observações gerais", long: true },
  ];

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      {fields.map((f) => (
        <label key={f.k} className={f.long ? "md:col-span-2 block" : "block"}>
          <span className="mb-1 block text-xs text-muted-foreground">{f.label}</span>
          {f.long ? (
            <textarea
              value={current[f.k] ?? ""}
              onChange={(e) => set(f.k, e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          ) : (
            <input
              value={current[f.k] ?? ""}
              onChange={(e) => set(f.k, e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          )}
        </label>
      ))}
      <div className="md:col-span-2 flex justify-end">
        <button
          disabled={saving}
          className="rounded-full bg-gradient-gold px-5 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar anamnese"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Evolução ---------- */

function EvolucaoTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListPhotos);
  const add = useServerFn(adminAddPhoto);
  const del = useServerFn(adminDeletePhoto);
  const { data, isLoading } = useQuery({
    queryKey: ["photos", clientId],
    queryFn: () => list({ data: { clientId } }),
  });
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState<"antes" | "depois" | "progresso">("progresso");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("client-photos").upload(path, file, {
        cacheControl: "3600",
      });
      if (up.error) throw up.error;
      await add({
        data: {
          client_id: clientId,
          storage_path: path,
          caption,
          tag,
          taken_at: new Date().toISOString().slice(0, 10),
        },
      });
      toast.success("Foto enviada.");
      setCaption("");
      qc.invalidateQueries({ queryKey: ["photos", clientId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro no upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta foto?")) return;
    try {
      await del({ data: { id } });
      toast.success("Foto removida.");
      qc.invalidateQueries({ queryKey: ["photos", clientId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Legenda</span>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="ex: progresso após 3 hidratações"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Tipo</span>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value as any)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="antes">Antes</option>
            <option value="depois">Depois</option>
            <option value="progresso">Progresso</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm text-white">
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando…" : "Enviar foto"}
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && !data?.length && (
        <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Nenhuma foto enviada ainda.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {data?.map((p: any) => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {p.url ? (
              <img src={p.url} alt={p.caption ?? ""} className="aspect-square w-full object-cover" />
            ) : (
              <div className="aspect-square w-full bg-secondary" />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-gold">{p.tag ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{formatBrDateOnly(p.taken_at)}</span>
              </div>
              {p.caption && <p className="mt-1 text-sm">{p.caption}</p>}
              <button
                onClick={() => onDelete(p.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Notificações ---------- */

function NotificacoesTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListNotifications);
  const create = useServerFn(adminCreateNotification);
  const del = useServerFn(adminDeleteNotification);
  const { data, isLoading } = useQuery({
    queryKey: ["notifs", clientId],
    queryFn: () => list({ data: { clientId } }),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"info" | "reminder" | "promo" | "system">("info");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await create({ data: { client_id: clientId, title, body, kind } });
      toast.success("Notificação enviada.");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["notifs", clientId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={send}
        className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 md:grid-cols-3"
      >
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as any)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="info">Info</option>
          <option value="reminder">Lembrete</option>
          <option value="promo">Promoção</option>
          <option value="system">Sistema</option>
        </select>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Mensagem"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-3"
        />
        <div className="md:col-span-3 flex justify-end">
          <button
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Enviar
          </button>
        </div>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
        {data?.map((n: any) => (
          <li key={n.id} className="flex items-start justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{n.title}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {n.kind}
                </span>
                {n.read_at && <span className="text-[10px] text-muted-foreground">✓ lida</span>}
              </div>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{formatBrDate(n.created_at)}</p>
            </div>
            <button
              onClick={async () => {
                await del({ data: { id: n.id } });
                qc.invalidateQueries({ queryKey: ["notifs", clientId] });
              }}
              className="text-destructive hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {!data?.length && !isLoading && (
          <li className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação enviada.</li>
        )}
      </ul>
    </div>
  );
}

/* ---------- Histórico ---------- */

function HistoricoTab({ clientId }: { clientId: string }) {
  const get = useServerFn(adminGetClientHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["clientHistory", clientId],
    queryFn: () => get({ data: { clientId } }),
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data?.length)
    return <p className="text-sm text-muted-foreground">Sem atendimentos registrados.</p>;
  return (
    <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
      {data.map((b: any) => (
        <li key={b.id} className="flex items-center justify-between p-4 text-sm">
          <div>
            <div className="font-medium">{b.service?.name}</div>
            <div className="text-xs text-muted-foreground">com {b.professional?.name}</div>
            {b.post_notes && <p className="mt-1 text-xs">📝 {b.post_notes}</p>}
            {b.products_used && <p className="text-xs text-muted-foreground">🧴 {b.products_used}</p>}
          </div>
          <div className="text-right">
            <div className="font-mono text-xs">
              {formatBrDateOnly(b.scheduled_date)} · {formatBrTime(b.start_time)}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{b.status}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
