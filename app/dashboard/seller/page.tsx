import { getSupabaseServer } from "@/lib/supabase-server";

export default async function SellerPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 📦 PRODUCTS */
  /* ============================= */
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", user.id);

  /* ============================= */
  /* 📦 ORDER ITEMS */
  /* ============================= */
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      quantity,
      base_price,
      order:orders (
        payment_status
      ),
      product:products (
        seller_id
      )
    `);

  const sellerItems = orderItems?.filter(
    (i: any) => i.product?.seller_id === user.id
  );

  /* ============================= */
  /* 💰 CALCULATE EARNINGS */
  /* ============================= */
  let totalEarnings = 0;
  let pendingEarnings = 0;

  sellerItems?.forEach((item: any) => {
    const amount = item.base_price * item.quantity;

    if (item.order?.payment_status === "paid") {
      totalEarnings += amount;
    } else {
      pendingEarnings += amount;
    }
  });

  return (
    <div className="max-w-6xl mx-auto">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-8">Seller Dashboard 🚀</h1>

      {/* ============================= */}
      {/* 💰 STATS */}
      {/* ============================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Total Earnings</h3>
          <p className="text-2xl font-bold text-green-600">
            ₹{totalEarnings}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Pending Earnings</h3>
          <p className="text-2xl font-bold text-yellow-600">
            ₹{pendingEarnings}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-gray-500">Total Products</h3>
          <p className="text-2xl font-bold">
            {products?.length || 0}
          </p>
        </div>

      </div>

      {/* ============================= */}
      {/* 📦 PRODUCT LIST */}
      {/* ============================= */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Products</h2>

        {products?.length === 0 && (
          <p className="text-gray-500">No products yet</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products?.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl shadow overflow-hidden">

              <img src={p.image} className="h-40 w-full object-cover" />

              <div className="p-4">
                <h3 className="font-bold">{p.name}</h3>

                <p className="text-sm text-gray-500">
                  Base: ₹{p.base_price}
                </p>

                <p className="font-semibold">
                  Selling: ₹{p.selling_price}
                </p>

                <p className="text-green-600 text-sm">
                  Profit: ₹{p.selling_price - p.base_price}
                </p>

                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                    p.status === "approved"
                      ? "bg-green-100 text-green-600"
                      : p.status === "pending"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {p.status}
                </span>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}