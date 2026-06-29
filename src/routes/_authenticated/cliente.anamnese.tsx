import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAnamnesis } from "@/lib/cliente360.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/cliente/anamnese")({
  component: AnamnesePage,
});

const LABELS: Record<string, string> = {
  hair_type: "Tipo de cabelo",
  hair_chemistry: "Química / coloração",
  hair_treatments: "Tratamentos recentes",
  scalp_condition: "Couro cabeludo",
  nail_condition: "Unhas",
  allergies: "Alergias",
  medications: "Medicações",
  health_conditions: "Condições de saúde",
  preferences: "Preferências",
  notes: "Observações",
};

function AnamnesePage() {
  const get = useServerFn(getMyAnamnesis);
  const { data, isLoading } = useQuery({ queryKey: ["myAnamnesis"], queryFn: () => get() });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-display text-2xl">Sua ficha de anamnese</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Informações registradas pela sua profissional. Para atualizar, fale com a equipe.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && !data && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Sua ficha ainda não foi preenchida. No seu próximo atendimento, a equipe vai cadastrar
            os dados aqui.
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ficha</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              {Object.entries(LABELS).map(([k, label]) => {
                const v = (data as any)[k];
                if (!v) return null;
                return (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm">{v}</dd>
                  </div>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
