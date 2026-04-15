import { getSupabaseServer } from "@/lib/supabase-server";
import InvoicesClient from "@/components/dashboard/seller/InvoicesClient";

export default async function SellerInvoicesPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">
        Invoices
      </h1>

      <InvoicesClient invoices={invoices || []} />
    </div>
  );
}