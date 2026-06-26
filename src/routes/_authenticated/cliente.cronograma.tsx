import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyHairSchedule,
  saveMyHairStep,
  toggleMyHairStep,
  deleteMyHairStep,
} from "@/lib/client-area.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Droplet, Leaf, Plus, Trash2, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/cronograma")({
  component: HairSchedulePage,
});

const STEP_META = {
  hidratacao: { label: "Hidratação", icon: Droplet, color: "text-blue-500", days: 7 },
  nutricao: { label: "Nutrição", icon: Leaf, color: "text-emerald-500", days: 15 },
  reconstrucao: { label: "Reconstrução", icon: Sparkles, color: "text-amber-500", days: 30 },
} as const;
type StepType = keyof typeof STEP_META;

function HairSchedulePage() {
  const qc = useQueryClient();
  const list = useServerFn(getMyHairSchedule);
  const save = useServerFn(saveMyHairStep);
  const toggle = useServerFn(toggleMyHairStep);
  const del = useServerFn(deleteMyHairStep);
  const data = useQuery({ queryKey: ["myHair"], queryFn: () => list() });

  const [type, setType] = useState<StepType>("hidratacao");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  function refresh() { qc.invalidateQueries({ queryKey: ["myHair"] }); }

  async function add() {
    await save({ data: { step_type: type, scheduled_date: date, notes } });
    // sugere próximo
    const next = new Date(date);
    next.setDate(next.getDate() + STEP_META[type].days);
    setDate(next.toISOString().slice(0, 10));
    setNotes("");
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl">Cronograma capilar</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar etapa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as StepType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hidratacao">Hidratação · 7d</SelectItem>
                <SelectItem value="nutricao">Nutrição · 15d</SelectItem>
                <SelectItem value="reconstrucao">Reconstrução · 30d</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: produto usado" />
          </div>
          <div className="sm:col-span-4">
            <Button onClick={add}><Plus className="h-4 w-4" /> Adicionar etapa</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(data.data ?? []).map((s: any) => {
          const meta = STEP_META[s.step_type as StepType];
          const Icon = meta.icon;
          return (
            <Card key={s.id} className={s.done ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-3 p-3">
                <button
                  onClick={async () => {
                    await toggle({ data: { id: s.id, done: !s.done } });
                    refresh();
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                  }`}
                  aria-label="Marcar como feito"
                >
                  {s.done && <Check className="h-4 w-4" />}
                </button>
                <Icon className={`h-5 w-5 ${meta.color}`} />
                <div className="flex-1">
                  <div className="font-medium">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.scheduled_date.split("-").reverse().join("/")}
                    {s.notes && ` · ${s.notes}`}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm("Remover etapa?")) return;
                    await del({ data: { id: s.id } });
                    refresh();
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          );
        })}
        {!data.data?.length && (
          <p className="text-sm text-muted-foreground">
            Comece adicionando uma hidratação para hoje — o sistema sugere a próxima etapa automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
