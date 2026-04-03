import { requestWithdraw } from "@/app/actions/wallet";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function WalletPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 💰 WALLET */
  /* ============================= */
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("reseller_id", user.id)
    .maybeSingle();

  /* ============================= */
  /* 🏦 BANK */
  /* ============================= */
  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("reseller_id", user.id)
    .maybeSingle();

  /* ============================= */
  /* 📜 TRANSACTIONS */
  /* ============================= */
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("reseller_id", user.id)
    .order("created_at", { ascending: false });

  /* ============================= */
  /* 💸 WITHDRAWS */
  /* ============================= */
  const { data: withdraws } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("reseller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="text-black space-y-8 max-w-4xl mx-auto">

      <h1 className="text-3xl font-bold">Wallet 💰</h1>

      {/* 💰 BALANCE CARD */}
      <div className="bg-black text-white p-6 rounded-2xl shadow">
        <p className="text-gray-300">Available Balance</p>
        <h2 className="text-4xl font-bold mt-1">
          ₹{wallet?.balance ?? 0}
        </h2>
      </div>

      {/* ⚠️ BANK STATUS */}
      {!bank?.is_verified && (
        <div className="bg-yellow-100 text-yellow-700 p-3 rounded text-sm">
          ⚠️ Add & verify bank details to enable withdrawals
        </div>
      )}

      {/* 💸 WITHDRAW FORM */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="font-semibold mb-3">Withdraw Money</h2>

        <form action={requestWithdraw} className="flex gap-2">
          <input
            type="number"
            name="amount"
            placeholder="Enter amount"
            className="border p-2 rounded w-full"
            required
            disabled={!bank?.is_verified}
          />

          <button
            disabled={!bank?.is_verified}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Withdraw
          </button>
        </form>
      </div>

      {/* 📜 TRANSACTIONS */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">
          Transactions
        </h2>

        {transactions?.length === 0 && (
          <p className="text-gray-500">No transactions yet</p>
        )}

        {transactions?.map((t: any) => (
          <div
            key={t.id}
            className="flex justify-between items-center border-b py-3"
          >
            <div>
              <p className="text-sm font-medium capitalize">
                {t.type}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(t.created_at).toLocaleString()}
              </p>
            </div>

            <span
              className={`font-bold ${
                t.type === "credit"
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {t.type === "credit" ? "+" : "-"}₹{t.amount}
            </span>
          </div>
        ))}
      </div>

      {/* 💸 WITHDRAW HISTORY */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">
          Withdraw History
        </h2>

        {withdraws?.length === 0 && (
          <p className="text-gray-500">No withdraw requests</p>
        )}

        {withdraws?.map((w: any) => (
          <div
            key={w.id}
            className="flex justify-between items-center border-b py-3"
          >
            <div>
              <p className="font-medium">₹{w.amount}</p>
              <p className="text-xs text-gray-500">
                {new Date(w.created_at).toLocaleString()}
              </p>
            </div>

            <StatusBadge status={w.status} />
          </div>
        ))}
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