import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyClient, updateMyProfile } from "@/lib/client-area.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCpfInput } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/cliente/perfil")({
  component: ProfilePage,
});

function ProfilePage() {
  const get = useServerFn(getMyClient);
  const save = useServerFn(updateMyProfile);
  const me = useQuery({ queryKey: ["myClient"], queryFn: () => get() });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me.data) {
      setName(me.data.name ?? "");
      setEmail(me.data.email ?? "");
      setCpf(me.data.cpf ? maskCpfInput(me.data.cpf) : "");
      setBirth(me.data.birth_date ?? "");
      setAddress(me.data.address ?? "");
    }
  }, [me.data]);

  async function submit() {
    setSaving(true);
    try {
      await save({
        data: {
          name,
          email,
          cpf: cpf.replace(/\D/g, ""),
          birth_date: birth,
          address,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Meu perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={me.data?.whatsapp ?? ""} disabled />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Para alterar o WhatsApp, fale com o salão.
            </p>
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF</Label>
              <Input value={cpf} onChange={(e) => setCpf(maskCpfInput(e.target.value))} />
            </div>
            <div>
              <Label>Nascimento</Label>
              <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Salvando…" : saved ? "Salvo ✓" : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
