import { requestWithdraw } from "@/app/actions/wallet";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CreditCard,
} from "lucide-react";

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
    .eq("seller_id", user.id)
    .maybeSingle();

  /* ============================= */
  /* 🏦 BANK */
  /* ============================= */
  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("seller_id", user.id)
    .maybeSingle();

  /* ============================= */
  /* 📜 TRANSACTIONS */
  /* ============================= */
  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  /* ============================= */
  /* 💸 WITHDRAWS */
  /* ============================= */
  const { data: withdraws } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const format = (n: number) =>
    new Intl.NumberFormat("en-IN").format(Math.round(n));

  const available =
    (wallet?.balance || 0) - (wallet?.locked_balance || 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Wallet 💰</h1>
        <p className="text-zinc-400 text-sm">
          Manage your earnings & withdrawals
        </p>
      </div>

      {/* ============================= */}
      {/* 💰 BALANCE */}
      {/* ============================= */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-500 p-8 rounded-3xl shadow-xl flex justify-between items-center">

        <div>
          <p className="text-white/80 text-sm">Available Balance</p>
          <h2 className="text-4xl font-bold mt-2">
            ₹{format(available)}
          </h2>

          <p className="text-xs mt-2 text-white/70">
            Total: ₹{format(wallet?.balance || 0)} | Locked: ₹{format(wallet?.locked_balance || 0)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Wallet className="w-5 h-5" />
          Secure Wallet
        </div>

      </div>

      {/* ============================= */}
      {/* 💳 WITHDRAW + BANK */}
      {/* ============================= */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* WITHDRAW */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">

          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
            Withdraw Money
          </h2>

          {!bank?.is_verified && (
            <div className="bg-yellow-500/10 text-yellow-400 p-3 rounded-xl text-sm mb-4">
              ⚠️ Bank not verified
            </div>
          )}

          <form action={requestWithdraw} className="space-y-3">
            <input
              type="number"
              name="amount"
              placeholder="Enter amount"
              className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 text-black"
              required
              disabled={!bank?.is_verified}
            />

            <button
              disabled={!bank?.is_verified}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl"
            >
              Withdraw
            </button>
          </form>
        </div>

        {/* BANK */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">

          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Bank Account
          </h2>

          {bank ? (
            <div className="space-y-2 text-sm">
              <p className="text-white font-medium">
                {bank.account_holder_name}
              </p>
              <p className="text-zinc-400">
                {bank.account_number}
              </p>
              <p className="text-zinc-400">
                IFSC: {bank.ifsc_code}
              </p>

              <StatusBadge status={bank.is_verified ? "verified" : "pending"} />
            </div>
          ) : (
            <p className="text-zinc-500">
              No bank added yet
            </p>
          )}
        </div>

      </div>

      {/* ============================= */}
      {/* 📊 DATA */}
      {/* ============================= */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* TRANSACTIONS */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-green-400" />
            Transactions
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {transactions?.map((t: any) => (
              <div
                key={t.id}
                className="flex justify-between bg-zinc-800 p-4 rounded-xl"
              >
                <div>
                  <p className="text-sm capitalize">{t.type}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`font-semibold ${
                    t.type === "credit"
                      ? "text-green-400"
                      : t.type === "lock"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {t.type === "credit" ? "+" : "-"}₹{format(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* WITHDRAW HISTORY */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-yellow-400" />
            Withdraws
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {withdraws?.map((w: any) => (
              <div
                key={w.id}
                className="bg-zinc-800 p-3 rounded-xl"
              >
                <p className="font-medium">₹{format(w.amount)}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(w.created_at).toLocaleString()}
                </p>

                <div className="mt-1">
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

/* ================= STATUS ================= */
function StatusBadge({ status }: any) {
  const map: any = {
    pending: "bg-yellow-500/10 text-yellow-400",
    approved: "bg-blue-500/10 text-blue-400",
    paid: "bg-green-500/10 text-green-400",
    rejected: "bg-red-500/10 text-red-400",
    failed: "bg-red-500/10 text-red-400",
    verified: "bg-green-500/10 text-green-400",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${map[status]}`}>
      {status}
    </span>
  );
}