// app/dashboard/seller/wallet/page.tsx

import { requestWithdraw } from "@/app/actions/wallet";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CreditCard,
  Lock,
  TrendingUp,
  Clock3,
  AlertCircle,
} from "lucide-react";

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

  if (!user) {
    return null;
  }

  /* ============================= */
  /* 💰 WALLET */
  /* ============================= */

  let {
    data: wallet,
  } = await supabase
    .from("wallets")
    .select("*")
    .eq("seller_id", user.id)
    .maybeSingle();

  if (!wallet) {
    const {
      data: createdWallet,
    } = await supabaseAdmin
      .from("wallets")
      .insert({
        seller_id: user.id,
        balance: 0,
        locked_balance: 0,
        total_earnings: 0,
        total_withdrawn: 0,
      })
      .select()
      .single();

    wallet = createdWallet;
  }

  /* ============================= */
  /* 🏦 BANK ACCOUNT */
  /* ============================= */

  const {
    data: bank,
  } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("seller_id", user.id)
    .maybeSingle();

  /* ============================= */
  /* 💸 WITHDRAW REQUESTS */
  /* ============================= */

  const {
    data: withdraws,
  } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  /* ============================= */
  /* 📜 TRANSACTIONS */
  /* ============================= */

  const {
    data: transactions,
  } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  /* ============================= */
  /* 📦 LOCKED SETTLEMENTS */
  /* ============================= */

  const {
    data: settlements,
  } = await supabaseAdmin
    .from("settlements")
    .select(`
      *,
      orders (
        order_code
      )
    `)
    .eq("seller_id", user.id)
    .eq("status", "locked")
    .order("release_date", {
      ascending: true,
    });

  /* ============================= */
  /* 💰 CALCULATIONS */
  /* ============================= */

  const availableBalance =
    Number(
      wallet?.balance || 0
    );

  const lockedBalance =
    Number(
      wallet?.locked_balance || 0
    );

  const totalEarnings =
    Number(
      wallet?.total_earnings || 0
    );

  const totalWithdrawn =
    Number(
      wallet?.total_withdrawn || 0
    );

  const upcomingAmount =
    settlements?.reduce(
      (
        sum: number,
        settlement: any
      ) =>
        sum +
        Number(
          settlement.amount || 0
        ),
      0
    ) || 0;

  const canWithdraw =
    bank?.is_verified &&
    availableBalance >= 100;

  /* ============================= */
  /* 💵 FORMATTER */
  /* ============================= */

  const formatPrice = (
    amount: number
  ) =>
    new Intl.NumberFormat(
      "en-IN"
    ).format(
      Math.round(amount || 0)
    );

  /* ============================= */
  /* 🧠 TRANSACTION LABELS */
  /* ============================= */

  function getTransactionTitle(
    type: string
  ) {
    switch (type) {
      case "credit_locked":
        return "Payment Received & Held Until Return Window Ends";

      case "release_locked":
        return "Settlement Released To Available Balance";

      case "withdraw_hold":
        return "Withdraw Request Created";

      case "withdraw_completed":
        return "Withdraw Completed";

      case "withdraw_rejected":
        return "Withdraw Request Rejected";

      case "refund":
        return "Refund Deducted";

      case "penalty":
        return "Penalty Deducted";

      case "debit":
        return "Wallet Debited";

      default:
        return type.replaceAll(
          "_",
          " "
        );
    }
  }

  /* ============================= */
  /* ➕ POSITIVE TXNS */
  /* ============================= */

  function isPositiveTransaction(
    type: string
  ) {
    return [
      "credit_locked",
      "release_locked",
      "withdraw_rejected",
    ].includes(type);
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 text-white">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div>
        <h1 className="text-4xl font-black flex items-center gap-3">
          <Wallet className="w-9 h-9 text-emerald-400" />
          Seller Wallet
        </h1>

        <p className="text-zinc-400 mt-2">
          Manage earnings,
          settlements and withdrawals
        </p>
      </div>

      {/* ============================= */}
      {/* STATS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">

        {/* AVAILABLE */}

        <StatCard
          title="Available Balance"
          value={availableBalance}
          subtitle="Ready for withdrawal"
          icon={
            <Wallet className="w-5 h-5 text-white/80" />
          }
          color="green"
        />

        {/* LOCKED */}

        <StatCard
          title="Locked Balance"
          value={lockedBalance}
          subtitle="Under return window"
          icon={
            <Lock className="w-5 h-5 text-yellow-400" />
          }
          color="dark"
          valueColor="text-yellow-400"
        />

        {/* TOTAL */}

        <StatCard
          title="Total Earnings"
          value={totalEarnings}
          subtitle="Lifetime seller earnings"
          icon={
            <TrendingUp className="w-5 h-5 text-blue-400" />
          }
          color="dark"
        />

        {/* WITHDRAWN */}

        <StatCard
          title="Total Withdrawn"
          value={totalWithdrawn}
          subtitle="Withdrawn by seller"
          icon={
            <Banknote className="w-5 h-5 text-red-400" />
          }
          color="dark"
          valueColor="text-red-400"
        />

        {/* UPCOMING */}

        <StatCard
          title="Upcoming Releases"
          value={upcomingAmount}
          subtitle="Pending settlement releases"
          icon={
            <Clock3 className="w-5 h-5 text-blue-400" />
          }
          color="dark"
          valueColor="text-blue-400"
        />
      </div>

      {/* ============================= */}
      {/* WITHDRAW + BANK */}
      {/* ============================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* WITHDRAW */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
            Withdraw Money
          </h2>

          {!bank && (
            <AlertBox
              color="red"
              text="No bank account added"
            />
          )}

          {bank &&
            !bank.is_verified && (
              <AlertBox
                color="yellow"
                text="Bank verification pending"
              />
            )}

          {availableBalance < 100 && (
            <AlertBox
              color="red"
              text="Minimum withdrawal amount is ₹100"
            />
          )}

          {canWithdraw && (
            <AlertBox
              color="green"
              text="Withdrawals enabled"
            />
          )}

          <form
            action={async (
              formData
            ) => {
              "use server";

              await requestWithdraw(
                formData
              );
            }}
            className="space-y-4 mt-5"
          >

            <input
              type="number"
              name="amount"
              min={100}
              step="0.01"
              max={availableBalance}
              required
              disabled={!canWithdraw}
              placeholder="Enter withdraw amount"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              disabled={!canWithdraw}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl py-3 font-semibold transition"
            >
              Withdraw Balance
            </button>
          </form>
        </div>

        {/* BANK */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Bank Account
          </h2>

          {bank ? (
            <div className="space-y-5">

              <InfoRow
                label="Account Holder"
                value={
                  bank.account_holder_name
                }
              />

              <InfoRow
                label="Account Number"
                value={`****${bank.account_number?.slice(-4)}`}
              />

              <InfoRow
                label="Bank Name"
                value={bank.bank_name}
              />

              <InfoRow
                label="IFSC"
                value={bank.ifsc_code}
              />

              <InfoRow
                label="UPI"
                value={
                  bank.upi_id || "-"
                }
              />

              <StatusBadge
                status={
                  bank.is_verified
                    ? "verified"
                    : "pending"
                }
              />
            </div>
          ) : (
            <EmptyState
              icon={
                <CreditCard className="w-10 h-10 opacity-40" />
              }
              text="No bank account added"
            />
          )}
        </div>
      </div>

      {/* ============================= */}
      {/* TRANSACTIONS + WITHDRAWS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* TRANSACTIONS */}

        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-green-400" />
            Wallet Transactions
          </h2>

          <div className="space-y-3 max-h-[700px] overflow-y-auto">

            {transactions?.length ? (
              transactions.map(
                (
                  transaction: any
                ) => {

                  const positive =
                    isPositiveTransaction(
                      transaction.type
                    );

                  return (
                    <div
                      key={
                        transaction.id
                      }
                      className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                    >

                      <div className="pr-4">
                        <p className="font-medium">
                          {getTransactionTitle(
                            transaction.type
                          )}
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(
                            transaction.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`text-lg font-black ${
                          positive
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {positive
                          ? "+"
                          : "-"}

                        ₹
                        {formatPrice(
                          Number(
                            transaction.amount || 0
                          )
                        )}
                      </div>
                    </div>
                  );
                }
              )
            ) : (
              <EmptyState
                icon={
                  <Wallet className="w-10 h-10 opacity-40" />
                }
                text="No transactions found"
              />
            )}
          </div>
        </div>

        {/* WITHDRAWS */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-yellow-400" />
            Withdraw Requests
          </h2>

          <div className="space-y-3">

            {withdraws?.length ? (
              withdraws.map(
                (
                  withdraw: any
                ) => (
                  <div
                    key={
                      withdraw.id
                    }
                    className="bg-zinc-800 rounded-2xl p-4"
                  >

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="font-bold text-lg">
                          ₹
                          {formatPrice(
                            Number(
                              withdraw.amount || 0
                            )
                          )}
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(
                            withdraw.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          withdraw.status
                        }
                      />
                    </div>
                  </div>
                )
              )
            ) : (
              <EmptyState
                icon={
                  <Banknote className="w-10 h-10 opacity-40" />
                }
                text="No withdraw requests yet"
              />
            )}
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* UPCOMING SETTLEMENTS */}
      {/* ============================= */}

      {settlements?.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
            <Clock3 className="w-5 h-5 text-blue-400" />
            Upcoming Settlement Releases
          </h2>

          <div className="space-y-3">

            {settlements.map(
              (
                settlement: any
              ) => {

                const releaseDate =
                  new Date(
                    settlement.release_date
                  );

                const daysLeft =
                  Math.ceil(
                    (
                      releaseDate.getTime() -
                      Date.now()
                    ) /
                      (
                        1000 *
                        60 *
                        60 *
                        24
                      )
                  );

                return (
                  <div
                    key={
                      settlement.id
                    }
                    className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                  >

                    <div>
                      <p className="font-semibold">
                        {
                          settlement
                            .orders
                            ?.order_code
                        }
                      </p>

                      <p className="text-sm text-zinc-500 mt-1">
                        Release:
                        {" "}
                        {releaseDate.toLocaleDateString()}
                      </p>

                      <p className="text-xs text-yellow-400 mt-1">
                        {daysLeft > 0
                          ? `${daysLeft} days remaining`
                          : "Releasing soon"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-400">
                        ₹
                        {formatPrice(
                          Number(
                            settlement.amount || 0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============================= */
/* 📊 STAT CARD */
/* ============================= */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  valueColor,
}: any) {

  const formatPrice = (
    amount: number
  ) =>
    new Intl.NumberFormat(
      "en-IN"
    ).format(
      Math.round(amount || 0)
    );

  return (
    <div
      className={`rounded-3xl p-6 border ${
        color === "green"
          ? "bg-gradient-to-br from-emerald-600 to-green-500 border-transparent"
          : "bg-zinc-900 border-zinc-800"
      }`}
    >

      <div className="flex items-center justify-between">
        <p
          className={`text-sm ${
            color === "green"
              ? "text-white/80"
              : "text-zinc-400"
          }`}
        >
          {title}
        </p>

        {icon}
      </div>

      <h2
        className={`text-4xl font-black mt-5 ${
          valueColor ||
          "text-white"
        }`}
      >
        ₹{formatPrice(value)}
      </h2>

      <p
        className={`text-sm mt-4 ${
          color === "green"
            ? "text-white/70"
            : "text-zinc-500"
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}

/* ============================= */
/* 🚨 ALERT */
/* ============================= */

function AlertBox({
  text,
  color,
}: {
  text: string;

  color:
    | "red"
    | "green"
    | "yellow";
}) {

  const styles = {
    red:
      "bg-red-500/10 border border-red-500/20 text-red-400",

    green:
      "bg-green-500/10 border border-green-500/20 text-green-400",

    yellow:
      "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400",
  };

  return (
    <div
      className={`rounded-2xl p-4 text-sm mb-4 ${styles[color]}`}
    >
      {text}
    </div>
  );
}

/* ============================= */
/* 🏷️ STATUS */
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

    completed:
      "bg-green-500/10 text-green-400 border border-green-500/20",

    rejected:
      "bg-red-500/10 text-red-400 border border-red-500/20",

    verified:
      "bg-green-500/10 text-green-400 border border-green-500/20",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
        styles[status] ||
        "bg-zinc-800 text-zinc-300"
      }`}
    >
      {status}
    </span>
  );
}

/* ============================= */
/* ℹ️ INFO */
/* ============================= */

function InfoRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {

  return (
    <div>
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="font-medium mt-1">
        {value}
      </p>
    </div>
  );
}

/* ============================= */
/* 📭 EMPTY */
/* ============================= */

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;

  text: string;
}) {

  return (
    <div className="text-center py-10 text-zinc-500">
      <div className="flex justify-center mb-3">
        {icon}
      </div>

      <p>{text}</p>
    </div>
  );
}