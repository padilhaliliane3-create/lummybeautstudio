import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyMaintenances, replyMyMaintenance } from "@/lib/client-area.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/cliente/cronograma")({
  component: ClientSchedulePage,
});

function ClientSchedulePage() {
  const qc = useQueryClient();
  const list = useServerFn(getMyMaintenances);
  const reply = useServerFn(replyMyMaintenance);
  
  const { data, isLoading } = useQuery({ 
    queryKey: ["myMaintenances"], 
    queryFn: () => list() 
  });

  const [processing, setProcessing] = useState<string | null>(null);

  function refresh() { qc.invalidateQueries({ queryKey: ["myMaintenances"] }); }

  async function handleReply(id: string, status: "confirmed" | "refused") {
    setProcessing(id);
    try {
      await reply({ data: { id, status } });
      toast.success(status === "confirmed" ? "Presença confirmada e agendamento gerado!" : "Sua recusa foi enviada.");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(null);
    }
  }

  const pending = (data ?? []).filter((m: any) => m.status === 'pending');
  const history = (data ?? []).filter((m: any) => m.status !== 'pending');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-display text-2xl">Meu Cronograma</h1>

      <section>
        <h2 className="mb-4 text-lg font-medium">Próximas Manutenções</h2>
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Você não possui manutenções pendentes de confirmação no momento.</p>
          )}
          {pending.map((m: any) => (
            <Card key={m.id} className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="mb-4 sm:mb-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium text-foreground">{m.procedure_name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(m.scheduled_date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})} 
                    {m.suggested_time && ` às ${m.suggested_time.slice(0, 5)}`}
                  </div>
                  {m.notes && <p className="mt-2 text-xs italic text-muted-foreground">{m.notes}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button 
                    variant="outline" 
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={processing === m.id}
                    onClick={() => handleReply(m.id, "refused")}
                  >
                    <X className="mr-2 h-4 w-4" /> Não poderei comparecer
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={processing === m.id}
                    onClick={() => handleReply(m.id, "confirmed")}
                  >
                    <Check className="mr-2 h-4 w-4" /> Confirmar presença
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Histórico e Agendados</h2>
        <div className="space-y-3">
          {!isLoading && history.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum histórico disponível.</p>
          )}
          {history.map((m: any) => (
            <Card key={m.id} className="opacity-80">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.procedure_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.scheduled_date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
                    {m.notes && ` · ${m.notes}`}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' :
                    m.status === 'refused' ? 'bg-destructive/10 text-destructive' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {m.status === 'confirmed' ? 'Confirmado' : m.status === 'refused' ? 'Recusado' : 'Concluído'}
                  </span>
                  {m.booking?.id && <div className="mt-1 text-[10px] text-emerald-600">Agendamento ativo</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
