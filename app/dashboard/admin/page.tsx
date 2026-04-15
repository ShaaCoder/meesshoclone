import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  Users,
  Package,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return redirect("/login");
  }

  /* ============================= */
  /* 📊 FETCH DATA */
  /* ============================= */
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("total_amount, payment_status, seller_payout");

  const { count: users } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: products } = await supabaseAdmin
    .from("products")
    .select("*", { count: "exact", head: true });

  /* ============================= */
  /* 💰 CALCULATIONS */
  /* ============================= */
  let revenue = 0;
  let profit = 0;
  let paidOrders = 0;

  orders?.forEach((o: any) => {
    if (o.payment_status === "paid") {
      const total = Number(o.total_amount || 0);
      const payout = Number(o.seller_payout || 0);

      revenue += total;
      profit += total - payout;
      paidOrders++;
    }
  });

  /* ============================= */
  /* 🚀 UI */
  /* ============================= */
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Admin Dashboard 🚀
        </h1>
        <p className="text-gray-500">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* STATS GRID */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Stat
          title="Users"
          value={users || 0}
          icon={<Users size={22} />}
          color="bg-blue-500"
        />

        <Stat
          title="Products"
          value={products || 0}
          icon={<Package size={22} />}
          color="bg-purple-500"
        />

        <Stat
          title="Orders"
          value={paidOrders}
          icon={<ShoppingCart size={22} />}
          color="bg-orange-500"
        />

        <Stat
          title="Revenue"
          value={`₹${revenue}`}
          icon={<IndianRupee size={22} />}
          color="bg-green-500"
        />

        <Stat
          title="Profit"
          value={`₹${profit}`}
          icon={<TrendingUp size={22} />}
          color="bg-emerald-600"
          highlight
        />
      </div>

      {/* EXTRA SECTION (future graphs / tables) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">
            📈 Sales Overview
          </h2>
          <div className="h-40 flex items-center justify-center text-gray-400">
            Chart coming soon...
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">
            🧾 Recent Orders
          </h2>
          <div className="text-gray-400 text-sm">
            Orders table coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* 🔥 STAT CARD */
/* ============================= */
function Stat({ title, value, icon, color, highlight }: any) {
  return (
    <div
      className={`rounded-2xl p-5 text-white shadow-sm flex items-center justify-between ${
        highlight
          ? "bg-gradient-to-r from-green-500 to-emerald-600"
          : color
      }`}
    >
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <h2 className="text-2xl font-bold mt-1">{value}</h2>
      </div>

      <div className="bg-white/20 p-3 rounded-xl">{icon}</div>
    </div>
  );
}