import { getSupabaseServer } from "@/lib/supabase-server";

export default async function SellerInvoicesPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please login</div>;
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-4 text-black">
      <h1 className="text-2xl font-bold">Invoices</h1>

      {invoices?.length === 0 && (
        <p className="text-gray-500">No invoices yet</p>
      )}

      {invoices?.map((inv) => (
        <div
          key={inv.id}
          className="border p-4 rounded flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{inv.invoice_number}</p>
            <p className="text-sm text-gray-500">
              ₹{inv.amount}
            </p>
          </div>

          <a
            href={inv.pdf_url}
            target="_blank"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Download
          </a>
        </div>
      ))}
    </div>
  );
}