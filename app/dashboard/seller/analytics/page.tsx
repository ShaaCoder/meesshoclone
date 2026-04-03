import { getSupabaseServer } from "@/lib/supabase-server";
import EarningsChart from "@/components/EarningsChart";
export default async function AnalyticsPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 📊 FETCH TRANSACTIONS */
  /* ============================= */
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("reseller_id", user.id)
    .order("created_at", { ascending: true });

  /* ============================= */
  /* 📈 CALCULATIONS */
  /* ============================= */
  const totalEarnings =
    transactions
      ?.filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalWithdrawn =
    transactions
      ?.filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  /* ============================= */
  /* 📅 GROUP BY DATE */
  /* ============================= */
  const dailyMap: any = {};

  transactions?.forEach((t) => {
    const date = new Date(t.created_at).toLocaleDateString();

    if (!dailyMap[date]) {
      dailyMap[date] = 0;
    }

    if (t.type === "credit") {
      dailyMap[date] += Number(t.amount);
    }
  });

  const chartData = Object.entries(dailyMap).map(
    ([date, amount]) => ({
      date,
      amount,
    })
  );

  return (
    <div className="p-6 space-y-6 text-black">

      <h1 className="text-3xl font-bold">Earnings Dashboard 📈</h1>

      {/* ============================= */}
      {/* 💰 STATS */}
      {/* ============================= */}
      <div className="grid md:grid-cols-3 gap-4">

        <Stat title="Total Earnings" value={`₹${totalEarnings}`} />

        <Stat title="Withdrawn" value={`₹${totalWithdrawn}`} />

        <Stat
          title="Available Balance"
          value={`₹${totalEarnings - totalWithdrawn}`}
        />
      </div>

      {/* ============================= */}
      {/* 📈 CHART */}
      {/* ============================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-4">
          Daily Earnings
        </h2>

        <EarningsChart data={chartData} />
      </div>
    </div>
  );
}

/* ============================= */
/* 📊 STAT CARD */
/* ============================= */
function Stat({ title, value }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}