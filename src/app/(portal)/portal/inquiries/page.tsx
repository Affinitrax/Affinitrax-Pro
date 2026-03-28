import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InquiryCard from "@/components/portal/InquiryCard";

export default async function InquiriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/portal/dashboard");

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-display">Inquiries</h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">
            {inquiries?.length ?? 0} total {inquiries?.length === 1 ? "inquiry" : "inquiries"}
          </p>
        </div>

        {/* Inquiry cards */}
        {!inquiries || inquiries.length === 0 ? (
          <div className="glass rounded-xl py-16 text-center">
            <p className="text-[#94a3b8] text-sm">No inquiries yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <InquiryCard key={inquiry.id} inquiry={inquiry} />
            ))}
          </div>
        )}
      </main>
  );
}
