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
  /* 📦 FETCH DATA (PARALLEL) */
  /* ============================= */
  const { data: requests, error } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch withdraws");

  const sellerIds = [...new Set(requests?.map((r: any) => r.seller_id))];

  /* ============================= */
  /* 🔥 FETCH RELATED DATA */
  /* ============================= */
  const [usersRes, walletsRes, banksRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, name, email")
      .in("id", sellerIds),

    supabaseAdmin
      .from("wallets")
      .select("seller_id, balance, locked_balance")
      .in("seller_id", sellerIds),

    supabaseAdmin
      .from("bank_accounts")
      .select("seller_id, account_holder_name, account_number, ifsc_code, is_verified")
      .in("seller_id", sellerIds),
  ]);

  /* ============================= */
  /* 🧠 MAP DATA */
  /* ============================= */
  const usersMap = Object.fromEntries(
    usersRes.data?.map((u: any) => [u.id, u]) || []
  );

  const walletMap = Object.fromEntries(
    walletsRes.data?.map((w: any) => [w.seller_id, w]) || []
  );

  const bankMap = Object.fromEntries(
    banksRes.data?.map((b: any) => [b.seller_id, b]) || []
  );

  const format = (n: number) =>
    new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div className="space-y-6 text-black">
      <h1 className="text-3xl font-bold">Withdraw Requests</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Seller</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Wallet</th>
              <th className="p-3">Bank</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests?.map((r: any) => {
              const user = usersMap[r.seller_id];
              const wallet = walletMap[r.seller_id];
              const bank = bankMap[r.seller_id];

              return (
                <tr key={r.id} className="border-t hover:bg-gray-50">

                  {/* 👤 SELLER */}
                  <td className="p-3">
                    <div className="font-semibold">
                      {user?.name || "No Name"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.email || r.seller_id}
                    </div>
                  </td>

                  {/* 💰 AMOUNT */}
                  <td className="p-3 text-center font-semibold">
                    ₹{format(r.amount)}
                  </td>

                  {/* 💳 WALLET */}
                  <td className="p-3 text-xs text-center">
                    <div>₹{format(wallet?.balance || 0)}</div>
                    <div className="text-gray-400">
                      Locked: ₹{format(wallet?.locked_balance || 0)}
                    </div>
                  </td>

                  {/* 🏦 BANK */}
                  <td className="p-3 text-xs text-center">
                    {bank ? (
                      <>
                        <div>{bank.account_holder_name}</div>
                        <div className="text-gray-400">
                          {bank.account_number}
                        </div>
                        <div className="text-gray-400">
                          {bank.ifsc_code}
                        </div>
                        {!bank.is_verified && (
                          <div className="text-yellow-500">
                            Not Verified
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">No Bank</span>
                    )}
                  </td>

                  {/* 📊 STATUS */}
                  <td className="p-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>

                  {/* 📅 DATE */}
                  <td className="p-3 text-xs text-center">
                    {new Date(r.created_at).toLocaleString()}
                  </td>

                  {/* ⚡ ACTIONS */}
                  <td className="p-3 text-center space-x-2">

                    {r.status === "pending" && (
                      <>
                        <form action={approveWithdraw.bind(null, r.id)}>
                          <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">
                            Approve
                          </button>
                        </form>

                        <form action={rejectWithdraw.bind(null, r.id)}>
                          <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">
                            Reject
                          </button>
                        </form>
                      </>
                    )}

                    {r.status === "approved" && (
                      <form action={markWithdrawPaid.bind(null, r.id)}>
                        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">
                          Mark Paid
                        </button>
                      </form>
                    )}

                    {r.status === "paid" && (
                      <span className="text-green-600 text-xs font-semibold">
                        Completed
                      </span>
                    )}

                    {r.status === "rejected" && (
                      <span className="text-red-500 text-xs font-semibold">
                        Rejected
                      </span>
                    )}

                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!requests?.length && (
          <div className="p-6 text-center text-gray-500">
            No withdraw requests found
          </div>
        )}
      </div>
    </div>
  );
}

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