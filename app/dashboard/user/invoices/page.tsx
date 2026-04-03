import { getSupabaseServer } from "@/lib/supabase-server";

export default async function InvoicePage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Not logged in</div>;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "customer") // 👈 IMPORTANT
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Invoices</h1>

      {invoices?.length === 0 && <p>No invoices found</p>}

      <div className="grid gap-4">
        {invoices?.map((inv) => (
          <div
            key={inv.id}
            className="border p-4 rounded-xl shadow-sm"
          >
            <p className="text-sm text-gray-500">
              Invoice ID: {inv.id}
            </p>

            <p className="text-lg font-semibold">
              ₹{inv.amount}
            </p>

            <p className="text-sm">
              Status: {inv.status}
            </p>

            <p className="text-sm">
              Order: {inv.order_id}
            </p>

            <p className="text-xs text-gray-400">
              {new Date(inv.created_at).toLocaleString()}
            </p>

            <button className="mt-2 px-4 py-2 bg-black text-white rounded">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}