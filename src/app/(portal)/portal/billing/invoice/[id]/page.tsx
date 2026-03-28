import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/components/portal/PrintButton";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("partner_id", user.id)
    .single();

  if (!invoice) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, telegram_handle")
    .eq("id", user.id)
    .single();

  const partnerName = profile?.company_name ?? profile?.telegram_handle ?? user.email ?? "Partner";
  const amount = Number(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const issueDate = new Date(invoice.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "On receipt";

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-10 flex gap-2">
        <PrintButton />
        <a href="/portal/billing" className="px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] bg-white/5 hover:bg-white/10 transition-colors">
          ← Back
        </a>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#080810] p-8 flex items-start justify-center">
        <div className="w-full max-w-2xl bg-[#0e0e1a] border border-white/10 rounded-2xl p-10 mt-12">
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <span className="text-2xl font-bold gradient-text font-display">Affinitrax</span>
              <p className="text-[#475569] text-xs mt-0.5 tracking-widest uppercase">Partner Portal</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Invoice</p>
              <p className="text-white font-mono text-sm">#{id.slice(0, 8).toUpperCase()}</p>
              <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                invoice.status === "paid" ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                invoice.status === "overdue" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}>{invoice.status}</span>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs text-[#475569] uppercase tracking-widest mb-2">From</p>
              <p className="text-white font-semibold">Affinitrax</p>
              <p className="text-[#94a3b8] text-sm">affinitrax.com</p>
            </div>
            <div>
              <p className="text-xs text-[#475569] uppercase tracking-widest mb-2">To</p>
              <p className="text-white font-semibold">{partnerName}</p>
              <p className="text-[#94a3b8] text-sm">{user.email}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Issue Date</p>
              <p className="text-white text-sm">{issueDate}</p>
            </div>
            <div>
              <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Due Date</p>
              <p className="text-white text-sm">{dueDate}</p>
            </div>
          </div>

          {/* Line item */}
          <div className="border border-white/10 rounded-xl overflow-hidden mb-8">
            <div className="grid grid-cols-3 px-5 py-3 bg-white/5 text-xs text-[#475569] uppercase tracking-widest">
              <span className="col-span-2">Description</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="grid grid-cols-3 px-5 py-4 border-t border-white/7">
              <span className="col-span-2 text-white text-sm">{invoice.description ?? "Services rendered"}</span>
              <span className="text-right text-[#f59e0b] font-semibold">{invoice.currency} {amount}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end mb-10">
            <div className="text-right">
              <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Total Due</p>
              <p className="text-3xl font-bold text-white font-display">{invoice.currency} {amount}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/7 pt-6">
            <p className="text-xs text-[#475569] text-center">
              Questions? Contact us on Telegram or at <span className="text-[#94a3b8]">info@affinitrax.com</span>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
