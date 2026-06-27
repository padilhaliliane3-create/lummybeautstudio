import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Catálogo completo para o fluxo de agendamento. */
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [cats, services, pros, links, settings] = await Promise.all([
    sb.from("categories").select("*").eq("active", true).order("sort_order"),
    sb.from("services").select("*").eq("active", true).order("name"),
    sb.from("professionals").select("*").eq("active", true).order("name"),
    sb.from("professional_services").select("*"),
    sb.from("salon_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (cats.error) throw cats.error;
  if (services.error) throw services.error;
  if (pros.error) throw pros.error;
  if (links.error) throw links.error;
  return {
    categories: cats.data ?? [],
    services: services.data ?? [],
    professionals: pros.data ?? [],
    links: links.data ?? [],
    settings: settings.data ?? null,
  };
});

/** Horários já ocupados de um profissional em uma data. */
export const getProfessionalAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: { professionalId: string; date: string }) =>
    z.object({ professionalId: z.string().uuid(), date: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [bookings, blocks] = await Promise.all([
      sb
        .from("bookings")
        .select("start_time,end_time,status")
        .eq("professional_id", data.professionalId)
        .eq("scheduled_date", data.date)
        .in("status", ["pending_payment", "confirmed"]),
      sb
        .from("schedule_blocks")
        .select("start_time,end_time")
        .eq("professional_id", data.professionalId)
        .eq("block_date", data.date),
    ]);
    if (bookings.error) throw bookings.error;
    if (blocks.error) throw blocks.error;
    return { bookings: bookings.data ?? [], blocks: blocks.data ?? [] };
  });

const createBookingSchema = z.object({
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  client: z.object({
    name: z.string().trim().min(2).max(120),
    whatsapp: z.string().trim().min(8).max(20),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    cpf: z.string().trim().max(20).optional().or(z.literal("")),
    birth_date: z.string().optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  }),
});

/** Cria cliente + agendamento (status pending_payment, entrada 20%). */
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createBookingSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();

    const [svcRes, proRes, settingsRes] = await Promise.all([
      sb.from("services").select("*").eq("id", data.serviceId).maybeSingle(),
      sb.from("professionals").select("*").eq("id", data.professionalId).maybeSingle(),
      sb.from("salon_settings").select("deposit_pct").eq("id", 1).maybeSingle(),
    ]);
    if (svcRes.error || !svcRes.data) throw new Error("Serviço não encontrado");
    if (proRes.error || !proRes.data) throw new Error("Profissional não encontrado");

    const service = svcRes.data;
    const depositPct = Number(settingsRes.data?.deposit_pct ?? 20);

    // calcula end_time
    const [h, m] = data.startTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + service.duration_min;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    // conflito?
    const conflict = await sb
      .from("bookings")
      .select("id,start_time,end_time")
      .eq("professional_id", data.professionalId)
      .eq("scheduled_date", data.date)
      .in("status", ["pending_payment", "confirmed"]);
    if (conflict.error) throw conflict.error;
    const overlap = (conflict.data ?? []).some((b) => {
      return !(endTime <= b.start_time || data.startTime >= b.end_time);
    });
    if (overlap) throw new Error("Esse horário acabou de ser reservado. Escolha outro.");

    const total = Number(service.price);
    const deposit = Math.round((total * depositPct) / 100 * 100) / 100;
    const remaining = Math.round((total - deposit) * 100) / 100;

    // upsert cliente por whatsapp — usa admin pois leitura/update agora exige owner ou admin
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existingClient = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("whatsapp", data.client.whatsapp)
      .maybeSingle();
    let clientId = existingClient.data?.id;
    const clientPayload = {
      name: data.client.name,
      whatsapp: data.client.whatsapp,
      email: data.client.email || null,
      cpf: data.client.cpf || null,
      birth_date: data.client.birth_date || null,
      address: data.client.address || null,
      notes: data.client.notes || null,
    };
    if (!clientId) {
      const ins = await supabaseAdmin
        .from("clients")
        .insert(clientPayload)
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      clientId = ins.data.id;
    } else {
      await supabaseAdmin.from("clients").update(clientPayload).eq("id", clientId);
    }

    const bookingIns = await supabaseAdmin
      .from("bookings")
      .insert({
        client_id: clientId,
        professional_id: data.professionalId,
        service_id: data.serviceId,
        scheduled_date: data.date,
        start_time: data.startTime,
        end_time: endTime,
        total_price: total,
        deposit_amount: deposit,
        remaining_amount: remaining,
        notes: data.client.notes || null,
      })
      .select("*")
      .single();
    if (bookingIns.error) throw bookingIns.error;

    return {
      booking: bookingIns.data,
      professional: proRes.data,
      service,
      depositPct,
    };
  });

/** Marca entrada como paga (após "confirmação" do Pix simulado). */
export const confirmDeposit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const upd = await sb
      .from("bookings")
      .update({ deposit_paid: true, status: "confirmed" })
      .eq("id", data.bookingId)
      .select("*")
      .single();
    if (upd.error) throw upd.error;
    return upd.data;
  });

/** Busca um agendamento por código (para tela de confirmação). */
export const getBookingByCode = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const res = await sb
      .from("bookings")
      .select("*, professional:professionals(*), service:services(*), client:clients(*)")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  });
