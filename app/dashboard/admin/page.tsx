import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  /* 💰 CALCULATIONS (FIXED 🔥) */
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
    <div className="space-y-6 text-black">
      <h1 className="text-3xl font-bold">Admin Dashboard 🚀</h1>

      <div className="grid md:grid-cols-4 gap-6">
        <Stat title="Users" value={users || 0} />
        <Stat title="Products" value={products || 0} />
        <Stat title="Orders (Paid)" value={paidOrders} />
        <Stat title="Revenue" value={`₹${revenue}`} />
        <Stat title="Profit" value={`₹${profit}`} />
      </div>
    </div>
  );
}

function Stat({ title, value }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  );
}