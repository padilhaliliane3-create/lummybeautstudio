import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListFinanceEntries,
  adminSaveFinanceEntry,
  adminDeleteFinanceEntry,
  adminFinanceSummary,
} from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Pencil, Trash2, Plus, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: FinancePage,
});

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function FinancePage() {
  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const getSummary = useServerFn(adminFinanceSummary);
  const summary = useQuery({
    queryKey: ["financeSummary", from, to],
    queryFn: () => getSummary({ data: { from, to } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Receita" value={summary.data?.totals.income ?? 0} />
            <Metric label="Despesas" value={summary.data?.totals.expense ?? 0} />
            <Metric
              label="Lucro"
              value={summary.data?.totals.profit ?? 0}
              accent={(summary.data?.totals.profit ?? 0) >= 0 ? "good" : "bad"}
            />
            <Metric label="Ticket médio" value={summary.data?.totals.ticket ?? 0} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Receita x Despesa por mês</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.data?.monthly ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Receita" fill="var(--gold)" />
                  <Bar dataKey="expense" name="Despesa" fill="var(--destructive)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <EntriesPanel from={from} to={to} />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashflowPanel from={from} to={to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: "good" | "bad" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`font-display text-2xl ${
            accent === "good" ? "text-emerald-600" : accent === "bad" ? "text-destructive" : "text-foreground"
          }`}
        >
          {fmt(value)}
        </div>
      </CardContent>
    </Card>
  );
}

function EntriesPanel({ from, to }: { from: string; to: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListFinanceEntries);
  const save = useServerFn(adminSaveFinanceEntry);
  const del = useServerFn(adminDeleteFinanceEntry);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const entries = useQuery({
    queryKey: ["financeEntries", from, to],
    queryFn: () => list({ data: { from, to } }),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["financeEntries"] });
    qc.invalidateQueries({ queryKey: ["financeSummary"] });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo lançamento
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Categoria</th>
                  <th className="p-3 text-left">Descrição</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(entries.data ?? []).map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-3">{e.entry_date.split("-").reverse().join("/")}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          e.type === "income"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {e.type === "income" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="p-3">{e.category}</td>
                    <td className="p-3 text-muted-foreground">{e.description ?? "—"}</td>
                    <td className="p-3 text-right font-medium">{fmt(Number(e.amount))}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => { setEditing(e); setOpen(true); }}
                        className="mr-2 text-muted-foreground hover:text-gold"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Excluir lançamento?")) return;
                          await del({ data: { id: e.id } });
                          refresh();
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!entries.data?.length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                      Nenhum lançamento no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <EntryDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSave={async (payload) => {
          await save({ data: payload });
          setOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function EntryDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  onSave: (p: any) => Promise<void>;
}) {
  const [type, setType] = useState<"income" | "expense">(editing?.type ?? "income");
  const [category, setCategory] = useState(editing?.category ?? "Serviços");
  const [amount, setAmount] = useState<string>(editing?.amount?.toString() ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [entryDate, setEntryDate] = useState(editing?.entry_date ?? todayISO());
  const [paymentMethod, setPaymentMethod] = useState(editing?.payment_method ?? "Pix");

  // sync when editing changes
  if (open && editing && editing.id !== (window as any).__lastEditId) {
    (window as any).__lastEditId = editing.id;
    setType(editing.type);
    setCategory(editing.category);
    setAmount(String(editing.amount));
    setDescription(editing.description ?? "");
    setEntryDate(editing.entry_date);
    setPaymentMethod(editing.payment_method ?? "");
  }
  if (open && !editing && (window as any).__lastEditId) {
    (window as any).__lastEditId = null;
    setType("income");
    setCategory("Serviços");
    setAmount("");
    setDescription("");
    setEntryDate(todayISO());
    setPaymentMethod("Pix");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Método de pagamento</Label>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() =>
              onSave({
                id: editing?.id,
                type,
                category,
                amount: Number(amount),
                description,
                entry_date: entryDate,
                payment_method: paymentMethod,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashflowPanel({ from, to }: { from: string; to: string }) {
  const list = useServerFn(adminListFinanceEntries);
  const entries = useQuery({
    queryKey: ["financeEntries", from, to],
    queryFn: () => list({ data: { from, to } }),
  });

  // dia a dia
  const byDay = new Map<string, { income: number; expense: number }>();
  (entries.data ?? []).forEach((e: any) => {
    const cur = byDay.get(e.entry_date) ?? { income: 0, expense: 0 };
    if (e.type === "income") cur.income += Number(e.amount);
    else cur.expense += Number(e.amount);
    byDay.set(e.entry_date, cur);
  });
  const rows = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  let balance = 0;
  const computed = rows.map(([date, v]) => {
    balance += v.income - v.expense;
    return { date, ...v, balance };
  });

  function exportCSV() {
    const csv = [
      "data;entrada;saida;saldo",
      ...computed.map((r) => `${r.date};${r.income.toFixed(2)};${r.expense.toFixed(2)};${r.balance.toFixed(2)}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-caixa-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fluxo de Caixa</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-right">Entrada</th>
                <th className="p-3 text-right">Saída</th>
                <th className="p-3 text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {computed.map((r) => (
                <tr key={r.date} className="border-b last:border-0">
                  <td className="p-3">{r.date.split("-").reverse().join("/")}</td>
                  <td className="p-3 text-right text-emerald-600">{fmt(r.income)}</td>
                  <td className="p-3 text-right text-destructive">{fmt(r.expense)}</td>
                  <td className="p-3 text-right font-medium">{fmt(r.balance)}</td>
                </tr>
              ))}
              {!computed.length && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                    Sem movimentações.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
