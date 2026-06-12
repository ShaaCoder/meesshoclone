import { redirect } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  IndianRupee,
  ShieldCheck,
  Wallet,
  XCircle,
  Banknote,
} from "lucide-react";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  approveWithdraw,
  rejectWithdraw,
  markWithdrawPaid,
} from "@/app/actions/admin";

/* ============================= */
/* 💸 ADMIN WITHDRAW PAGE */
/* ============================= */

export default async function WithdrawPage() {
  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profile?.role !== "admin"
  ) {
    redirect("/login");
  }

  /* ============================= */
  /* 📦 FETCH REQUESTS */
  /* ============================= */

  let {
    data: requests,
    error,
  } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "WITHDRAW FETCH ERROR:",
      error
    );

    requests = [];
  }

  const sellerIds = [
    ...new Set(
      requests?.map(
        (r: any) => r.seller_id
      ) || []
    ),
  ];

  /* ============================= */
  /* 🔥 FETCH RELATED DATA */
  /* ============================= */

  const [
    usersRes,
    walletsRes,
    banksRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select(`
        id,
        name,
        email
      `)
      .in("id", sellerIds),

    supabaseAdmin
      .from("wallets")
      .select(`
        seller_id,
        balance,
        locked_balance
      `)
      .in(
        "seller_id",
        sellerIds
      ),

    supabaseAdmin
      .from("bank_accounts")
      .select(`
        seller_id,
        account_holder_name,
        account_number,
        ifsc_code,
        is_verified
      `)
      .in(
        "seller_id",
        sellerIds
      ),
  ]);

  /* ============================= */
  /* 🧠 MAPS */
  /* ============================= */

  const usersMap =
    Object.fromEntries(
      usersRes.data?.map(
        (u: any) => [u.id, u]
      ) || []
    );

  const walletsMap =
    Object.fromEntries(
      walletsRes.data?.map(
        (w: any) => [
          w.seller_id,
          w,
        ]
      ) || []
    );

  const banksMap =
    Object.fromEntries(
      banksRes.data?.map(
        (b: any) => [
          b.seller_id,
          b,
        ]
      ) || []
    );

  /* ============================= */
  /* 💰 FORMAT */
  /* ============================= */

  const formatPrice = (
    value: number
  ) =>
    new Intl.NumberFormat(
      "en-IN"
    ).format(
      Math.round(value || 0)
    );

  /* ============================= */
  /* 📊 STATS */
  /* ============================= */

  const pendingCount =
    requests?.filter(
      (r: any) =>
        r.status ===
        "pending"
    ).length || 0;

  const approvedCount =
    requests?.filter(
      (r: any) =>
        r.status ===
        "approved"
    ).length || 0;

  const paidCount =
    requests?.filter(
      (r: any) =>
        r.status === "paid"
    ).length || 0;

  return (
    <div className="space-y-6 text-black">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Withdraw Requests
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage seller payout requests
          </p>
        </div>
      </div>

      {/* ============================= */}
      {/* STATS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">
                Pending
              </p>

              <h2 className="text-3xl font-bold mt-1">
                {pendingCount}
              </h2>
            </div>

            <div className="bg-yellow-100 p-3 rounded-xl">
              <Clock3 className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">
                Approved
              </p>

              <h2 className="text-3xl font-bold mt-1">
                {approvedCount}
              </h2>
            </div>

            <div className="bg-blue-100 p-3 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">
                Paid
              </p>

              <h2 className="text-3xl font-bold mt-1">
                {paidCount}
              </h2>
            </div>

            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

      </div>

      {/* ============================= */}
      {/* TABLE */}
      {/* ============================= */}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

            <thead className="bg-gray-50 border-b">

              <tr className="text-xs uppercase text-gray-500">

                <th className="text-left p-4">
                  Seller
                </th>

                <th className="text-center p-4">
                  Amount
                </th>

                <th className="text-center p-4">
                  Wallet
                </th>

                <th className="text-center p-4">
                  Bank
                </th>

                <th className="text-center p-4">
                  Status
                </th>

                <th className="text-center p-4">
                  Date
                </th>

                <th className="text-center p-4">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {requests?.map(
                (request: any) => {

                  const seller =
                    usersMap[
                      request.seller_id
                    ];

                  const wallet =
                    walletsMap[
                      request.seller_id
                    ];

                  const bank =
                    banksMap[
                      request.seller_id
                    ];

                  return (
                    <tr
                      key={request.id}
                      className="border-b hover:bg-gray-50 transition"
                    >

                      {/* SELLER */}

                      <td className="p-4">

                        <div className="font-semibold">
                          {seller?.name ||
                            "Unknown Seller"}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          {seller?.email}
                        </div>

                      </td>

                      {/* AMOUNT */}

                      <td className="p-4 text-center">

                        <div className="inline-flex items-center gap-1 font-bold text-lg">

                          <IndianRupee className="w-4 h-4" />

                          {formatPrice(
                            request.amount
                          )}

                        </div>

                      </td>

                      {/* WALLET */}

                      <td className="p-4 text-center text-sm">

                        <div className="flex items-center justify-center gap-2 font-semibold">

                          <Wallet className="w-4 h-4 text-gray-500" />

                          ₹
                          {formatPrice(
                            wallet?.balance ||
                              0
                          )}

                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          Locked: ₹
                          {formatPrice(
                            wallet?.locked_balance ||
                              0
                          )}
                        </div>

                      </td>

                      {/* BANK */}

                      <td className="p-4 text-center text-xs">

                        {bank ? (
                          <div className="space-y-1">

                            <div className="font-semibold">
                              {
                                bank.account_holder_name
                              }
                            </div>

                            <div className="text-gray-500">
                              {
                                bank.account_number
                              }
                            </div>

                            <div className="text-gray-500">
                              {
                                bank.ifsc_code
                              }
                            </div>

                            {bank.is_verified ? (
                              <div className="text-green-600 font-medium">
                                Verified
                              </div>
                            ) : (
                              <div className="text-yellow-600 font-medium">
                                Not Verified
                              </div>
                            )}

                          </div>
                        ) : (
                          <span className="text-gray-400">
                            No Bank
                          </span>
                        )}

                      </td>

                      {/* STATUS */}

                      <td className="p-4 text-center">

                        <StatusBadge
                          status={
                            request.status
                          }
                        />

                      </td>

                      {/* DATE */}

                      <td className="p-4 text-center text-xs text-gray-500">

                        {new Date(
                          request.created_at
                        ).toLocaleString()}

                      </td>

                      {/* ACTIONS */}

                      <td className="p-4">

                        <div className="flex items-center justify-center gap-2 flex-wrap">

                          {/* ============================= */}
                          {/* PENDING */}
                          {/* ============================= */}

                          {request.status ===
                            "pending" && (
                            <>

                              <form
                                action={async () => {
                                  "use server";

                                  await approveWithdraw(
                                    request.id
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-medium transition"
                                >
                                  Approve
                                </button>
                              </form>

                              <form
                                action={async () => {
                                  "use server";

                                  await rejectWithdraw(
                                    request.id
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-xl font-medium transition"
                                >
                                  Reject
                                </button>
                              </form>

                            </>
                          )}

                          {/* ============================= */}
                          {/* APPROVED */}
                          {/* ============================= */}

                          {request.status ===
                            "approved" && (
                            <form
                              action={async () => {
                                "use server";

                                await markWithdrawPaid(
                                  request.id
                                );
                              }}
                            >
                              <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-xl font-medium transition inline-flex items-center gap-1"
                              >
                                <Banknote className="w-3 h-3" />

                                Mark Paid
                              </button>
                            </form>
                          )}

                          {/* ============================= */}
                          {/* PAID */}
                          {/* ============================= */}

                          {request.status ===
                            "paid" && (
                            <div className="text-green-600 text-xs font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Completed
                            </div>
                          )}

                          {/* ============================= */}
                          {/* REJECTED */}
                          {/* ============================= */}

                          {request.status ===
                            "rejected" && (
                            <div className="text-red-600 text-xs font-semibold inline-flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Rejected
                            </div>
                          )}

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

        {!requests?.length && (

          <div className="p-16 text-center">

            <div className="flex justify-center mb-4">
              <Wallet className="w-14 h-14 text-gray-300" />
            </div>

            <h3 className="text-lg font-semibold">
              No withdraw requests
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              Seller withdraw requests will appear here
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

/* ============================= */
/* 📊 STATUS BADGE */
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
      "bg-yellow-100 text-yellow-700",

    approved:
      "bg-blue-100 text-blue-700",

    paid:
      "bg-green-100 text-green-700",

    rejected:
      "bg-red-100 text-red-700",

    failed:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}