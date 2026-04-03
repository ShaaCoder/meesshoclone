import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  approveWithdraw,
  rejectWithdraw,
  markWithdrawPaid,
} from "@/app/actions/admin";

export default async function WithdrawPage() {
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

  if (profile?.role !== "admin") return redirect("/login");

  /* ============================= */
  /* 📦 FETCH REQUESTS + USER */
  /* ============================= */
  const { data: requests } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*, users(name, email)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 text-black">
      <h1 className="text-3xl font-bold">Withdraw Requests</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Seller</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests?.map((r: any) => (
              <tr key={r.id} className="border-t">

                {/* 👤 SELLER */}
                <td className="p-3">
                  <div className="font-semibold">
                    {r.users?.name || "No Name"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.users?.email}
                  </div>
                </td>

                {/* 💰 AMOUNT */}
                <td className="p-3 font-semibold">
                  ₹{r.amount}
                </td>

                {/* 📊 STATUS */}
                <td className="p-3">
                  <StatusBadge status={r.status} />
                </td>

                {/* 📅 DATE */}
                <td className="p-3 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>

                {/* ⚡ ACTIONS */}
                <td className="p-3 space-x-2">

                  {/* ⏳ PENDING */}
                  {r.status === "pending" && (
                    <>
                      <form action={approveWithdraw.bind(null, r.id)}>
                        <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs">
                          Approve
                        </button>
                      </form>

                      <form action={rejectWithdraw.bind(null, r.id)}>
                        <button className="bg-red-500 text-white px-3 py-1 rounded text-xs">
                          Reject
                        </button>
                      </form>
                    </>
                  )}

                  {/* ✅ APPROVED → MARK PAID */}
                  {r.status === "approved" && (
                    <form action={markWithdrawPaid.bind(null, r.id)}>
                      <button className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                        Mark Paid
                      </button>
                    </form>
                  )}

                  {/* 🟢 DONE */}
                  {r.status === "paid" && (
                    <span className="text-green-600 text-xs font-semibold">
                      Completed
                    </span>
                  )}

                  {/* ❌ REJECTED */}
                  {r.status === "rejected" && (
                    <span className="text-red-500 text-xs">
                      Rejected
                    </span>
                  )}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================= */
/* 🎨 STATUS BADGE */
/* ============================= */
function StatusBadge({ status }: any) {
  const map: any = {
    pending: "bg-yellow-100 text-yellow-600",
    approved: "bg-blue-100 text-blue-600",
    paid: "bg-green-100 text-green-600",
    rejected: "bg-red-100 text-red-600",
    failed: "bg-red-100 text-red-600",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${map[status]}`}>
      {status}
    </span>
  );
}