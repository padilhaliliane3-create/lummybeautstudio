import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Plus, Pencil, Trash2, History, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminListClients,
  adminSaveClient,
  adminDeleteClient,
  adminGetClientHistory,
} from "@/lib/clients.functions";
import {
  maskBrPhone,
  toE164BR,
  toWaDigits,
  isValidBrPhone,
  formatBrFromE164,
} from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: ClientsPage,
});

type Client = {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

function ClientsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListClients);
  const remove = useServerFn(adminDeleteClient);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [historyOf, setHistoryOf] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["adminClients"], queryFn: () => list() });

  const filtered = (data ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.whatsapp ?? "").includes(q) ||
      (c.cpf ?? "").includes(q)
    );
  });

  async function onDelete(c: Client) {
    if (!confirm(`Excluir ${c.name}?`)) return;
    try {
      await remove({ data: { id: c.id } });
      toast.success("Cliente removido.");
      qc.invalidateQueries({ queryKey: ["adminClients"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Cadastro completo, histórico de atendimentos e WhatsApp direto.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm text-white"
        >
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, WhatsApp, e-mail ou CPF…"
        className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3 hidden md:table-cell">E-mail</th>
              <th className="px-4 py-3 hidden md:table-cell">Cadastro</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum cliente.</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{formatBrFromE164(c.whatsapp)}</span>
                    <a
                      href={`https://wa.me/${toWaDigits(c.whatsapp)}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir WhatsApp"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.email ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => setHistoryOf(c as Client)} className="rounded-md p-1.5 hover:bg-secondary" title="Histórico">
                      <History className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditing(c as Client)} className="rounded-md p-1.5 hover:bg-secondary" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(c as Client)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ClientForm
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["adminClients"] });
          }}
        />
      )}
      {historyOf && <HistoryModal client={historyOf} onClose={() => setHistoryOf(null)} />}
    </div>
  );
}

function ClientForm({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(adminSaveClient);
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client ? formatBrFromE164(client.whatsapp) : "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [cpf, setCpf] = useState(client?.cpf ?? "");
  const [birth, setBirth] = useState(client?.birth_date ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidBrPhone(phone)) {
      toast.error("WhatsApp inválido. Use (DDD) XXXXX-XXXX.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: client?.id,
          name,
          whatsapp: toE164BR(phone),
          email,
          cpf,
          birth_date: birth,
          address,
          notes,
        },
      });
      toast.success(client ? "Cliente atualizado." : "Cliente cadastrado.");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-elegant"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-foreground">{client ? "Editar cliente" : "Novo cliente"}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Nome completo *">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="WhatsApp *">
            <input
              required
              value={phone}
              onChange={(e) => setPhone(maskBrPhone(e.target.value))}
              placeholder="(42) 99999-9999"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </Field>
          <Field label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="CPF">
            <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Data de nascimento">
            <input type="date" value={birth ?? ""} onChange={(e) => setBirth(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Endereço">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Observações">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-full bg-gradient-gold px-5 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function HistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const history = useServerFn(adminGetClientHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["clientHistory", client.id],
    queryFn: () => history({ data: { clientId: client.id } }),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-foreground">Histórico — {client.name}</h3>
            <p className="text-xs text-muted-foreground">{formatBrFromE164(client.whatsapp)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem atendimentos.</p>
          )}
          <ul className="divide-y divide-border/60">
            {data?.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{b.service?.name}</div>
                  <div className="text-xs text-muted-foreground">com {b.professional?.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs">
                    {new Date(b.scheduled_date).toLocaleDateString("pt-BR")} · {b.start_time?.slice(0, 5)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{b.status}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
