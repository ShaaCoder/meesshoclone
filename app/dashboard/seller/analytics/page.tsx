import { getSupabaseServer } from "@/lib/supabase-server";
import EarningsChart from "@/components/EarningsChart";
import {
  IndianRupee,
  TrendingUp,
  Wallet,
  Package,
} from "lucide-react";

export default async function AnalyticsPage({
  searchParams,
}: any) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 📅 DATE FILTER */
  /* ============================= */
  const range = searchParams?.range || "7";

  const daysMap: any = {
    "7": 7,
    "30": 30,
    "90": 90,
  };

  const days = daysMap[range];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  /* ============================= */
  /* 📊 FETCH TRANSACTIONS */
  /* ============================= */
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("reseller_id", user.id)
    .gte("created_at", fromDate.toISOString())
    .order("created_at", { ascending: true });

  /* ============================= */
  /* 📦 FETCH PRODUCTS (TOP SELLING) */
  /* ============================= */
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      quantity,
      products(name)
    `)
    .eq("seller_id", user.id);

  const productMap: any = {};

  orderItems?.forEach((item: any) => {
    const name = item.products?.name || "Unknown";

    if (!productMap[name]) productMap[name] = 0;
    productMap[name] += item.quantity;
  });

  const topProducts = Object.entries(productMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a: any, b: any) => b.qty - a.qty)
    .slice(0, 5);

  /* ============================= */
  /* 📈 CALCULATIONS */
  /* ============================= */
  const totalEarnings =
    transactions
      ?.filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const prevEarnings = totalEarnings * 0.85; // mock previous

  const growth = prevEarnings
    ? ((totalEarnings - prevEarnings) / prevEarnings) * 100
    : 0;

  const totalWithdrawn =
    transactions
      ?.filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const balance = totalEarnings - totalWithdrawn;

  const format = (num: number) =>
    new Intl.NumberFormat("en-IN").format(Math.round(num));

  /* ============================= */
  /* 📅 CHART DATA */
  /* ============================= */
  const dailyMap: any = {};

  transactions?.forEach((t) => {
    const date = new Date(t.created_at).toLocaleDateString();

    if (!dailyMap[date]) {
      dailyMap[date] = { earnings: 0, orders: 0 };
    }

    if (t.type === "credit") {
      dailyMap[date].earnings += Number(t.amount);
      dailyMap[date].orders += 1;
    }
  });

  const chartData = Object.entries(dailyMap).map(
    ([date, val]: any) => ({
      date,
      earnings: val.earnings,
      orders: val.orders,
    })
  );

  return (
    <div className="p-6 space-y-8 text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Analytics 📊
          </h1>
          <p className="text-zinc-400 text-sm">
            Performance overview
          </p>
        </div>

        {/* DATE FILTER */}
        <div className="flex gap-2">
          {["7", "30", "90"].map((d) => (
            <a
              key={d}
              href={`?range=${d}`}
              className={`px-4 py-2 rounded-lg text-sm ${
                range === d
                  ? "bg-emerald-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-6">

        <Stat
          title="Total Earnings"
          value={`₹${format(totalEarnings)}`}
          icon={<TrendingUp />}
          extra={`↑ ${growth.toFixed(1)}%`}
        />

        <Stat
          title="Withdrawn"
          value={`₹${format(totalWithdrawn)}`}
          icon={<IndianRupee />}
        />

        <Stat
          title="Balance"
          value={`₹${format(balance)}`}
          icon={<Wallet />}
        />

        <Stat
          title="Orders"
          value={`${chartData.reduce((s, d) => s + d.orders, 0)}`}
          icon={<Package />}
        />

      </div>

      {/* CHART */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="mb-4 font-semibold">
          Earnings vs Orders
        </h2>
        <EarningsChart data={chartData} />
      </div>

      {/* TOP PRODUCTS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="mb-4 font-semibold">
          Top Selling Products
        </h2>

        <div className="space-y-3">
          {topProducts.map((p: any, i: number) => (
            <div
              key={i}
              className="flex justify-between bg-zinc-800 p-3 rounded-xl"
            >
              <span>{p.name}</span>
              <span className="text-emerald-400">
                {p.qty} sold
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ================= STAT ================= */
function Stat({ title, value, icon, extra }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex justify-between items-center">

      <div>
        <p className="text-zinc-400 text-sm">{title}</p>
        <h2 className="text-xl font-bold">{value}</h2>

        {extra && (
          <p className="text-green-400 text-sm mt-1">
            {extra}
          </p>
        )}
      </div>

      <div className="bg-zinc-800 p-3 rounded-xl">
        {icon}
      </div>

    </div>
  );
}