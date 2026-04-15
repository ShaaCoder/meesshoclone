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

  if (!user) return null;

  const params = await searchParams;
  const currentPage = parseInt(params.page || "1");
  const itemsPerPage = 9;

  /* ============================= */
  /* 📦 FETCH PRODUCTS WITH VARIANTS */
  /* ============================= */
const { data: products, count } = await supabase
  .from("products")
  .select(`
    *,
    product_variants!product_variants_product_id_fkey (
      price,
      cost_price
    )
  `, { count: "exact" })
  .eq("seller_id", user.id)
  .neq("status", "deleted") // ✅ THIS LINE FIXES IT
  .order("created_at", { ascending: false })
  .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

  /* ============================= */
  /* 💰 FETCH ORDER ITEMS */
  /* ============================= */
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      quantity,
      price,
      cost_price,
      order:orders(payment_status),
      product:products(seller_id)
    `);

  const sellerItems = orderItems?.filter(
    (i: any) => i.product?.seller_id === user.id
  );

  let totalEarnings = 0;
  let pendingEarnings = 0;

  sellerItems?.forEach((item: any) => {
    const selling = Number(item.price || 0);
    const cost = Number(item.cost_price || 0);

    const profit = (selling - cost) * item.quantity;

    if (item.order?.payment_status === "paid") {
      totalEarnings += profit;
    } else {
      pendingEarnings += profit;
    }
  });

  const totalPages = Math.ceil((count || 0) / itemsPerPage);

  return (
    <div className="flex-1 p-8 bg-zinc-950 text-white min-h-screen">
      
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Welcome back! Here's what's happening with your store.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400 text-sm">Total Earnings</p>
          <p className="text-4xl font-bold text-emerald-500 mt-3">
            ₹{totalEarnings.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400 text-sm">Pending Earnings</p>
          <p className="text-4xl font-bold text-amber-500 mt-3">
            ₹{pendingEarnings.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400 text-sm">Total Products</p>
          <p className="text-4xl font-bold mt-3">{count || 0}</p>
        </div>

      </div>

      {/* PRODUCTS HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Products</h2>
        <p className="text-zinc-500">
          Showing {(currentPage - 1) * itemsPerPage + 1}–
          {Math.min(currentPage * itemsPerPage, count || 0)} of {count}
        </p>
      </div>

      {/* EMPTY */}
      {products?.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          You haven't added any products yet.
        </div>
      ) : (
        <>
          {/* GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product: any) => (
              <SellerProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* PAGINATION */}
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