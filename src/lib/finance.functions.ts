import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrySchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1).max(60),
  amount: z.number().nonnegative(),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  entry_date: z.string(),
  payment_method: z.string().trim().max(40).optional().or(z.literal("")),
  booking_id: z.string().uuid().optional().nullable(),
});

const filterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().optional(),
});

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Acesso restrito");
}

export const adminListFinanceEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("finance_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(1000);
    if (data.from) q = q.gte("entry_date", data.from);
    if (data.to) q = q.lte("entry_date", data.to);
    if (data.type) q = q.eq("type", data.type);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const adminSaveFinanceEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => entrySchema.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const payload = {
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description || null,
      entry_date: data.entry_date,
      payment_method: data.payment_method || null,
      booking_id: data.booking_id || null,
      created_by: context.userId,
    };
    const sb = context.supabase;
    if (data.id) {
      const { error } = await sb.from("finance_entries").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("finance_entries")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminDeleteFinanceEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("finance_entries").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    const [entriesRes, completedRes] = await Promise.all([
      sb
        .from("finance_entries")
        .select("type,amount,entry_date,category")
        .gte("entry_date", data.from)
        .lte("entry_date", data.to),
      sb
        .from("bookings")
        .select("total_price,scheduled_date,status")
        .gte("scheduled_date", data.from)
        .lte("scheduled_date", data.to)
        .eq("status", "completed"),
    ]);
    if (entriesRes.error) throw entriesRes.error;
    if (completedRes.error) throw completedRes.error;

    const entries = entriesRes.data ?? [];
    const completed = completedRes.data ?? [];

    const incomeManual = entries
      .filter((e: any) => e.type === "income")
      .reduce((s: number, e: any) => s + Number(e.amount), 0);
    const expense = entries
      .filter((e: any) => e.type === "expense")
      .reduce((s: number, e: any) => s + Number(e.amount), 0);
    const incomeServices = completed.reduce(
      (s: number, b: any) => s + Number(b.total_price),
      0,
    );
    const totalIncome = incomeManual + incomeServices;
    const profit = totalIncome - expense;
    const ticket = completed.length ? incomeServices / completed.length : 0;

    // série mensal
    const byMonth = new Map<string, { income: number; expense: number }>();
    function bump(date: string, key: "income" | "expense", v: number) {
      const m = date.slice(0, 7);
      const cur = byMonth.get(m) ?? { income: 0, expense: 0 };
      cur[key] += v;
      byMonth.set(m, cur);
    }
    entries.forEach((e: any) =>
      bump(e.entry_date, e.type === "income" ? "income" : "expense", Number(e.amount)),
    );
    completed.forEach((b: any) => bump(b.scheduled_date, "income", Number(b.total_price)));
    const monthly = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v, profit: v.income - v.expense }));

    return {
      totals: {
        income: totalIncome,
        incomeManual,
        incomeServices,
        expense,
        profit,
        ticket,
        completedCount: completed.length,
      },
      monthly,
      entries,
    };
  });
