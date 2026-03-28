import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    partner_id: string;
    deal_id?: string;
    amount: number;
    currency?: string;
    description?: string;
    due_date?: string;
  };

  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .insert({
      partner_id: body.partner_id,
      deal_id: body.deal_id || null,
      amount: body.amount,
      currency: body.currency ?? "USDT",
      description: body.description ?? null,
      due_date: body.due_date ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify partner via Telegram
  const { data: partnerProfile } = await admin
    .from("profiles")
    .select("telegram_chat_id, telegram_notifications, company_name")
    .eq("id", body.partner_id)
    .single();

  if (partnerProfile?.telegram_chat_id && partnerProfile.telegram_notifications) {
    const due = body.due_date ? ` · Due ${new Date(body.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "";
    await sendPartnerNotification(
      partnerProfile.telegram_chat_id,
      `🧾 <b>New Invoice — Affinitrax</b>\n\n<b>${body.currency ?? "USDT"} ${Number(body.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>${due}\n${body.description ? `\n${body.description}` : ""}\n\nView it in your <a href="https://affinitrax.com/portal/billing">Billing dashboard</a>.`
    );
  }

  return NextResponse.json({ success: true, id: invoice.id });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("*, profiles!invoices_partner_id_fkey(company_name, telegram_handle)")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
