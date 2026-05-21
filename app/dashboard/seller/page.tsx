import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import SellerProductCard from "@/components/dashboard/seller/SellerProductCard";
import Pagination from "@/components/ui/Pagination";

export default async function SellerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  /* ============================= */
  /* 📄 PAGINATION */
  /* ============================= */
  const params = await searchParams;
  const currentPage = Number(params?.page || 1);
  const itemsPerPage = 9;

  /* ============================= */
  /* 📦 PRODUCTS (FIXED) */
  /* ============================= */
  const { data: products, count, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_variants (
        cost_price,
        mrp,
        stock
      )
    `,
      { count: "exact" }
    )
    .eq("seller_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .range(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage - 1
    );

  if (error) {
    console.error("PRODUCT ERROR:", error);
  }

  /* ============================= */
  /* 💰 EARNINGS (FIXED) */
  /* ============================= */
  const { data: sellerItems } = await supabase
    .from("order_items")
    .select(`
      quantity,
      final_price,
      cost_price,
      orders(payment_status)
    `)
    .eq("seller_id", user.id);

  let totalEarnings = 0;
  let pendingEarnings = 0;

  sellerItems?.forEach((item: any) => {
    const selling = Number(item.final_price || 0);
    const cost = Number(item.cost_price || 0);
    const profit = (selling - cost) * item.quantity;

    if (item.orders?.payment_status === "paid") {
      totalEarnings += profit;
    } else {
      pendingEarnings += profit;
    }
  });

  const totalPages = Math.ceil((count || 0) / itemsPerPage);

  return (
    <div className="flex-1 p-8 bg-zinc-950 text-white min-h-screen">

      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-zinc-900 rounded-xl">
          <p>Total Earnings</p>
          <p className="text-2xl text-green-400">
            ₹{totalEarnings.toLocaleString()}
          </p>
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl">
          <p>Pending Earnings</p>
          <p className="text-2xl text-yellow-400">
            ₹{pendingEarnings.toLocaleString()}
          </p>
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl">
          <p>Total Products</p>
          <p className="text-2xl">{count || 0}</p>
        </div>
      </div>

      {/* PRODUCTS */}
      {!products?.length ? (
        <p>No products found</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            {products.map((p: any) => (
              <SellerProductCard key={p.id} product={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
            />
          )}
        </>
      )}
    </div>
  );
}