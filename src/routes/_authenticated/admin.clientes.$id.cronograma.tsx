import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListClientMaintenances, adminSaveClientMaintenance, adminDeleteClientMaintenance } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronLeft, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id/cronograma")({
  component: ClientScheduleAdminPage,
});

function ClientScheduleAdminPage() {
  const { id } = Route.useParams({ from: '/_authenticated/admin/clientes/$id/cronograma' });
  const qc = useQueryClient();
  const list = useServerFn(adminListClientMaintenances);
  const save = useServerFn(adminSaveClientMaintenance);
  const del = useServerFn(adminDeleteClientMaintenance);

  const { data, isLoading } = useQuery({ 
    queryKey: ["adminClientSchedule", id], 
    queryFn: () => list({ data: { clientId: id } }) 
  });

  const [type, setType] = useState<"hair" | "nails" | "other">("hair");
  const [procName, setProcName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() { qc.invalidateQueries({ queryKey: ["adminClientSchedule", id] }); }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!procName) return toast.error("Informe o procedimento");
    setSaving(true);
    try {
      await save({
        data: {
          client_id: id,
          type,
          procedure_name: procName,
          scheduled_date: date,
          suggested_time: time || undefined,
          notes: notes || undefined,
        }
      });
      toast.success("Etapa adicionada.");
      setProcName("");
      setNotes("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(mId: string) {
    if (!confirm("Excluir esta manutenção?")) return;
    try {
      await del({ data: { id: mId } });
      toast.success("Etapa excluída.");
      refresh();
    } catch(err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/admin/clientes" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-secondary">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="font-display text-2xl text-foreground">Gerenciar Cronograma</h2>
          <p className="text-sm text-muted-foreground">Adicione e acompanhe os agendamentos de manutenção do cliente.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Label>Categoria</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hair">Cabelo</SelectItem>
                  <SelectItem value="nails">Unhas</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-4">
              <Label>Procedimento</Label>
              <Input required value={procName} onChange={e => setProcName(e.target.value)} placeholder="Ex: Manutenção de Fibra, Retoque de Raiz..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Data Prevista</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Horário Sugerido (Opcional)</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div className="sm:col-span-6">
              <Label>Observações</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Orientações ou produtos..." />
            </div>
            <div className="sm:col-span-6">
              <Button type="submit" disabled={saving}>Adicionar ao Cronograma</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Procedimento</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>}
            {!isLoading && data?.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhuma manutenção agendada.</td></tr>}
            {data?.map(m => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.procedure_name}</div>
                  <div className="text-xs text-muted-foreground">{m.type === 'hair' ? 'Cabelo' : m.type === 'nails' ? 'Unhas' : 'Outros'} {m.notes && `· ${m.notes}`}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{new Date(m.scheduled_date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}</div>
                  <div className="text-xs text-muted-foreground">{m.suggested_time?.slice(0, 5) || "Sem horário"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    m.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                    m.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {m.status === 'pending' ? 'Pendente' : m.status === 'confirmed' ? 'Confirmado' : m.status === 'refused' ? 'Recusado' : 'Concluído'}
                  </span>
                  {m.booking?.id && <div className="mt-1 text-[10px] text-emerald-600">Agendado</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(m.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
