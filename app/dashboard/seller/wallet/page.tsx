import { requestWithdraw } from "@/app/actions/wallet";

import { getSupabaseServer } from "@/lib/supabase-server";

import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CreditCard,
  Lock,
} from "lucide-react";
import { supabaseAdmin }
from "@/lib/supabase-admin";
export default async function WalletPage() {
  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 💰 FETCH WALLET */
  /* ============================= */

  const {
    data: wallet,
    error: walletError,
  } = await supabase
    .from("wallets")
    .select("*")
    .eq("seller_id", user.id)
    .single();

  console.log(
    "wallet:",
    wallet
  );

  console.log(
    "walletError:",
    walletError
  );

  /* ============================= */
  /* 🏦 FETCH BANK */
  /* ============================= */

  const {
    data: bank,
    error: bankError,
  } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("seller_id", user.id)
    .single();

  console.log(
    "bank:",
    bank
  );

  console.log(
    "bankError:",
    bankError
  );

  /* ============================= */
  /* 📜 FETCH TRANSACTIONS */
  /* ============================= */

  const {
    data: transactions,
  } = await supabase
    .from(
      "wallet_transactions"
    )
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  /* ============================= */
  /* 💸 FETCH WITHDRAWS */
  /* ============================= */

  const {
    data: withdraws,
  } = await supabase
    .from(
      "withdraw_requests"
    )
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", {
      ascending: false,
    });
/* ============================= */
/* ⏳ UPCOMING PAYOUTS */
/* ============================= */

const {
  data: upcomingPayouts,
  error: upcomingError,
} = await supabaseAdmin
  .from("orders")
  .select(`
    id,
    order_code,
    seller_payout,
    seller_paid,
    delivered_at,
    payout_release_at
  `)
  .eq("seller_id", user.id)
  .eq("seller_paid", false)
  .not(
    "payout_release_at",
    "is",
    null
  )
  .order(
    "payout_release_at",
    {
      ascending: true,
    }
  );

console.log(
  "UPCOMING PAYOUTS:",
  upcomingPayouts
);

console.log(
  "UPCOMING ERROR:",
  upcomingError
);

/* ============================= */
/* 💰 UPCOMING PAYOUT TOTAL */
/* ============================= */

const upcomingPayoutAmount =
  upcomingPayouts
    ?.filter(
      (p: any) =>
        !p.seller_paid
    )
    .reduce(
      (sum, payout) =>
        sum +
        Number(
          payout.seller_payout ||
            0
        ),
      0
    ) || 0;
  /* ============================= */
  /* 💰 CALCULATIONS */
  /* ============================= */

  const availableBalance =
    Number(
      wallet?.balance || 0
    );

  const lockedBalance =
    Number(
      wallet?.locked_balance ||
        0
    );

  const totalBalance =
    availableBalance +
    lockedBalance;

  const canWithdraw =
    !!bank?.is_verified &&
    availableBalance > 0;

  const format = (
    amount: number
  ) =>
    new Intl.NumberFormat(
      "en-IN"
    ).format(
      Math.round(amount)
    );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 text-white">
      {/* ============================= */}
      {/* 🧾 HEADER */}
      {/* ============================= */}

      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <Wallet className="w-8 h-8 text-emerald-400" />
          Wallet
        </h1>

        <p className="text-zinc-400 mt-1">
          Manage your earnings,
          withdrawals &
          settlements
        </p>
      </div>

      {/* ============================= */}
      {/* 💰 BALANCE CARDS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* AVAILABLE */}

        <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-3xl p-6 shadow-xl">
          <p className="text-sm text-white/70">
            Available Balance
          </p>

          <h2 className="text-4xl font-black mt-3">
            ₹
            {format(
              availableBalance
            )}
          </h2>

          <div className="flex items-center gap-2 mt-4 text-sm text-white/80">
            <Wallet className="w-4 h-4" />
            Ready to withdraw
          </div>
        </div>

        {/* LOCKED */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-sm text-zinc-400">
            Locked Balance
          </p>

          <h2 className="text-4xl font-black mt-3 text-yellow-400">
            ₹
            {format(
              lockedBalance
            )}
          </h2>

          <div className="flex items-center gap-2 mt-4 text-sm text-zinc-400">
            <Lock className="w-4 h-4" />
            Pending delivery
          </div>
        </div>

        {/* TOTAL */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-sm text-zinc-400">
            Total Earnings
          </p>

          <h2 className="text-4xl font-black mt-3">
            ₹
            {format(
              totalBalance
            )}
          </h2>

          <div className="flex items-center gap-2 mt-4 text-sm text-zinc-400">
            <Banknote className="w-4 h-4" />
            Lifetime earnings
          </div>
        </div>
      </div>
     {/* UPCOMING PAYOUT */}

<div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
  <p className="text-sm text-zinc-400">
    Upcoming Payout
  </p>

  <h2 className="text-4xl font-black mt-3 text-blue-400">
    ₹
    {format(
      upcomingPayoutAmount
    )}
  </h2>

  <div className="flex items-center gap-2 mt-4 text-sm text-zinc-400">
    <Banknote className="w-4 h-4" />
    Releasing after return window
  </div>
</div>
      {/* ============================= */}
      {/* 💳 WITHDRAW + BANK */}
      {/* ============================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WITHDRAW */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
            Withdraw Money
          </h2>

          {/* NO BANK */}

          {!bank && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4">
              No bank account
              found
            </div>
          )}

          {/* BANK NOT VERIFIED */}

          {bank &&
            !bank.is_verified && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl text-sm mb-4">
                Bank account not
                verified by admin
              </div>
            )}

          {/* NO BALANCE */}

          {availableBalance <=
            0 && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4">
              No withdrawable
              balance available
            </div>
          )}

          {/* VERIFIED */}

          {canWithdraw && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm mb-4">
              ✅ Withdrawals are
              enabled
            </div>
          )}

          <form
            action={
              requestWithdraw
            }
            className="space-y-4"
          >
            <input
              type="number"
              name="amount"
              placeholder="Enter amount"
              min={1}
              max={
                availableBalance
              }
              required
              disabled={
                !canWithdraw
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              disabled={
                !canWithdraw
              }
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-3 font-semibold transition"
            >
              Withdraw
            </button>
          </form>
        </div>

        {/* BANK */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Bank Account
          </h2>

          {bank ? (
            <div className="space-y-4">
              {/* ACCOUNT HOLDER */}

              <div>
                <p className="text-xs text-zinc-500">
                  Account Holder
                </p>

                <p className="font-medium">
                  {
                    bank.account_holder_name
                  }
                </p>
              </div>

              {/* ACCOUNT NUMBER */}

              <div>
                <p className="text-xs text-zinc-500">
                  Account Number
                </p>

                <p className="font-medium">
                  ****
                  {bank.account_number?.slice(
                    -4
                  )}
                </p>
              </div>

              {/* BANK */}

              <div>
                <p className="text-xs text-zinc-500">
                  Bank Name
                </p>

                <p className="font-medium">
                  {bank.bank_name}
                </p>
              </div>

              {/* IFSC */}

              <div>
                <p className="text-xs text-zinc-500">
                  IFSC Code
                </p>

                <p className="font-medium">
                  {
                    bank.ifsc_code
                  }
                </p>
              </div>

              {/* UPI */}

              <div>
                <p className="text-xs text-zinc-500">
                  UPI ID
                </p>

                <p className="font-medium">
                  {bank.upi_id ||
                    "-"}
                </p>
              </div>

              {/* STATUS */}

              <StatusBadge
                status={
                  bank.is_verified
                    ? "verified"
                    : "pending"
                }
              />
            </div>
          ) : (
            <div className="text-zinc-500">
              No bank account
              added
            </div>
          )}
        </div>
      </div>

      {/* ============================= */}
      {/* 📊 TRANSACTIONS + WITHDRAWS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TRANSACTIONS */}

        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="mb-5 font-semibold flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-green-400" />
            Transactions
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {transactions?.length ? (
              transactions.map(
                (t: any) => {
                  const isCredit =
                    t.type ===
                    "credit";

                  const isRelease =
                    t.type ===
                    "release";

                  const isPositive =
                    isCredit ||
                    isRelease;

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-zinc-800 rounded-2xl p-4"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {t.note ||
                            t.type}
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(
                            t.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`font-bold text-lg ${
                          isCredit
                            ? "text-green-400"
                            : isRelease
                            ? "text-blue-400"
                            : "text-red-400"
                        }`}
                      >
                        {isPositive
                          ? "+"
                          : "-"}

                        ₹
                        {format(
                          Number(
                            t.amount ||
                              0
                          )
                        )}
                      </div>
                    </div>
                  );
                }
              )
            ) : (
              <div className="text-zinc-500 text-sm">
                No transactions
                found
              </div>
            )}
          </div>
        </div>

        {/* WITHDRAW REQUESTS */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="mb-5 font-semibold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-yellow-400" />
            Withdraw Requests
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {withdraws?.length ? (
              withdraws.map(
                (w: any) => (
                  <div
                    key={w.id}
                    className="bg-zinc-800 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">
                          ₹
                          {format(
                            Number(
                              w.amount ||
                                0
                            )
                          )}
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(
                            w.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          w.status
                        }
                      />
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="text-zinc-500 text-sm">
                No withdraw
                requests
              </div>
            )}
          </div>
        </div>
      </div>
 {/* ============================= */}
{/* ⏳ UPCOMING PAYOUTS */}
{/* ============================= */}

<div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
  <h2 className="mb-5 font-semibold flex items-center gap-2">
    <Banknote className="w-5 h-5 text-blue-400" />
    Upcoming Payouts
  </h2>

  <div className="space-y-3">
    {upcomingPayouts?.length ? (
      upcomingPayouts
        .filter(
          (payout: any) =>
            !payout.seller_paid
        )
        .map(
          (payout: any) => {
            const releaseDate =
              new Date(
                payout.payout_release_at
              );

            const diff =
              Math.ceil(
                (
                  releaseDate.getTime() -
                  Date.now()
                ) /
                  (1000 *
                    60 *
                    60 *
                    24)
              );

            return (
              <div
                key={payout.id}
                className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {
                      payout.order_code
                    }
                  </p>

                  <p className="text-sm text-zinc-400 mt-1">
                    Releases on{" "}
                    {releaseDate.toLocaleDateString()}
                  </p>

                  <p className="text-xs text-yellow-400 mt-1">
                    {diff > 0
                      ? `${diff} days remaining`
                      : "Releasing soon"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-blue-400">
                    ₹
                    {format(
                      Number(
                        payout.seller_payout ||
                          0
                      )
                    )}
                  </p>
                </div>
              </div>
            );
          }
        )
    ) : (
      <div className="text-zinc-500 text-sm">
        No upcoming payouts
      </div>
    )}
  </div>
</div>
    </div>
  );
}

/* ============================= */
/* 🏷 STATUS BADGE */
/* ============================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    pending:
      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",

    approved:
      "bg-blue-500/10 text-blue-400 border border-blue-500/20",

    paid:
      "bg-green-500/10 text-green-400 border border-green-500/20",

    rejected:
      "bg-red-500/10 text-red-400 border border-red-500/20",

    failed:
      "bg-red-500/10 text-red-400 border border-red-500/20",

    verified:
      "bg-green-500/10 text-green-400 border border-green-500/20",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
        styles[status] ||
        "bg-zinc-800 text-zinc-300"
      }`}
    >
      {status}
    </span>
  );
}