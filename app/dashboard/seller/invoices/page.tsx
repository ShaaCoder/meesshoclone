import { getSupabaseServer } from "@/lib/supabase-server";

export default async function SellerInvoicesPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Not logged in</div>;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "seller")
    .order("created_at", { ascending: false });

  const totalEarnings =
    invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Seller Earnings</h1>

      <div className="mt-4 p-4 bg-green-100 rounded-xl">
        <p className="text-lg font-semibold">
          Total Earnings: ₹{totalEarnings}
        </p>
      </div>

      <div className="grid gap-4 mt-6">
        {invoices?.map((inv) => (
          <div key={inv.id} className="border p-4 rounded-xl">
            <p>Order: {inv.order_id}</p>
            <p>Amount: ₹{inv.amount}</p>
            <p>Status: {inv.status}</p>
            <p>
              Date:{" "}
              {new Date(inv.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}