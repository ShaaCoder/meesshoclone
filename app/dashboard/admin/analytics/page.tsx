import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminChart from "@/components/AdminChart";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await getSupabaseServer();

  /* ✅ FIX: unwrap searchParams */
  const params = await searchParams;
  const from = params?.from;
  const to = params?.to;

  /* 🔐 ADMIN CHECK */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;

  /* 📅 FILTER QUERY */
  let ordersQuery = supabaseAdmin.from("orders").select("*");

  if (from) ordersQuery = ordersQuery.gte("created_at", from);
  if (to) ordersQuery = ordersQuery.lte("created_at", to);

  const { data: orders } = await ordersQuery;

  /* 📦 EXTRA DATA */
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("*");

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*");

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, image");

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, avatar_url");

  /* 🧠 MAPS */
  const productMap: any = {};
  products?.forEach((p) => {
    productMap[p.id] = p;
  });

  const userMap: any = {};
  users?.forEach((u) => {
    userMap[u.id] = u;
  });

  /* 📊 STATS */
  const totalOrders = orders?.length || 0;

  const totalRevenue =
    orders?.reduce(
      (sum, o) =>
        o.payment_status === "paid"
          ? sum + Number(o.total_amount || 0)
          : sum,
      0
    ) || 0;

  const totalPayout =
    orders?.reduce(
      (sum, o) =>
        o.payment_status === "paid"
          ? sum + Number(o.seller_payout || 0)
          : sum,
      0
    ) || 0;

  const profit = totalRevenue - totalPayout;

  const sellerEarnings =
    invoices
      ?.filter((i) => i.type === "seller")
      .reduce((s, i) => s + Number(i.amount), 0) || 0;

  const resellerEarnings =
    invoices
      ?.filter((i) => i.type === "reseller")
      .reduce((s, i) => s + Number(i.amount), 0) || 0;

  /* 📈 CHART */
  const dailyMap: any = {};

  orders?.forEach((o) => {
    if (o.payment_status !== "paid") return;

    const date = new Date(o.created_at).toLocaleDateString();

    if (!dailyMap[date]) {
      dailyMap[date] = { revenue: 0, payout: 0 };
    }

    dailyMap[date].revenue += Number(o.total_amount || 0);
    dailyMap[date].payout += Number(o.seller_payout || 0);
  });

  const chartData = Object.entries(dailyMap).map(
    ([date, val]: any) => ({
      date,
      revenue: val.revenue,
      profit: val.revenue - val.payout,
    })
  );

  /* 🏆 TOP PRODUCTS */
  const productSales: any = {};

  items?.forEach((i) => {
    if (!productSales[i.product_id]) {
      productSales[i.product_id] = 0;
    }
    productSales[i.product_id] += i.quantity;
  });

  const topProducts = Object.entries(productSales)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  /* 🏆 TOP SELLERS */
  const sellerMapData: any = {};

  orders?.forEach((o) => {
    if (!sellerMapData[o.seller_id]) {
      sellerMapData[o.seller_id] = 0;
    }
    sellerMapData[o.seller_id] += Number(o.seller_payout || 0);
  });

  const topSellers = Object.entries(sellerMapData)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6 text-black">

      <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>

      {/* FILTER */}
      <form className="flex gap-2 bg-white p-4 rounded-xl shadow">
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="border p-2 rounded"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="border p-2 rounded"
        />
        <button className="bg-black text-white px-4 rounded">
          Apply
        </button>
      </form>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card title="Orders" value={totalOrders} />
        <Card title="Revenue" value={`₹${totalRevenue}`} />
        <Card title="Payout" value={`₹${totalPayout}`} />
        <Card title="Profit" value={`₹${profit}`} />
      </div>

      {/* EXTRA */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Seller Earnings" value={`₹${sellerEarnings}`} />
        <Card title="Reseller Earnings" value={`₹${resellerEarnings}`} />
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-4">Revenue vs Profit</h2>
        <AdminChart data={chartData} />
      </div>

      {/* TOP PRODUCTS */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-4">🔥 Top Products</h2>

        {topProducts.map(([id, qty]: any) => {
          const product = productMap[id];

          return (
            <div key={id} className="flex items-center gap-4 py-2">
              <img
                src={product?.image || "/placeholder.png"}
                className="w-10 h-10 rounded"
              />
              <div>
                <p className="font-medium">
                  {product?.name || "Unknown Product"}
                </p>
                <p className="text-sm text-gray-500">
                  Sold: {qty}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOP SELLERS */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-4">🏆 Top Sellers</h2>

        {topSellers.map(([id, amt]: any) => {
          const seller = userMap[id];

          return (
            <div key={id} className="flex items-center gap-4 py-2">
              <img
                src={seller?.avatar_url || "/avatar.png"}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium">
                  {seller?.name || "Unknown"}
                </p>
                <p className="text-sm text-gray-500">
                  Earned: ₹{amt}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* CARD */
function Card({ title, value }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
