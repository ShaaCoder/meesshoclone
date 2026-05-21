import Link from "next/link";

import { redirect } from "next/navigation";

import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  IndianRupee,
  Landmark,
  Package,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function ReturnsPage() {

  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* AUTH */
  /* ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  /* ============================= */
  /* FETCH RETURNS */
  /* ============================= */

  const { data: returns } =
    await supabaseAdmin
      .from("returns")
      .select(`
        *,

        order_items (
          id,
          quantity,
          final_price,
          product_name,

          products (
            slug,

            product_images (
              url,
              is_primary
            )
          )
        ),

        orders (
          order_code,
          payment_method
        ),

        users!returns_customer_id_fkey (
          id,
          name,

          customer_refund_accounts (
            id,
            upi_id,
            bank_name,
            account_number,
            is_default
          )
        )
      `)
      .eq("customer_id", user.id)
      .order("created_at", {
        ascending: false,
      });

  /* ============================= */
  /* STATS */
  /* ============================= */

  const totalReturns =
    returns?.length || 0;

  const pendingReturns =
    returns?.filter(
      (r: any) =>
        r.status ===
        "requested"
    ).length || 0;

  const processingReturns =
    returns?.filter(
      (r: any) =>
        r.status ===
          "approved" ||
        r.pickup_status
    ).length || 0;

  const completedReturns =
    returns?.filter(
      (r: any) =>
        r.status ===
        "completed"
    ).length || 0;

  /* ============================= */
  /* STATUS */
  /* ============================= */

  const getStatusUI = (
    item: any
  ) => {

    if (
      item.status ===
      "completed"
    ) {
      return {
        icon: CheckCircle2,

        label:
          "Refund Completed",

        class:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

        progress:
          "Completed",

        description:
          "Refund successfully processed.",
      };
    }

    if (
      item.qc_status ===
      "failed"
    ) {
      return {
        icon: XCircle,

        label:
          "QC Failed",

        class:
          "bg-red-500/10 text-red-400 border-red-500/20",

        progress:
          "Failed",

        description:
          "Product failed seller quality inspection.",
      };
    }

    if (
      item.status ===
      "rejected"
    ) {
      return {
        icon: XCircle,

        label:
          "Return Rejected",

        class:
          "bg-red-500/10 text-red-400 border-red-500/20",

        progress:
          "Rejected",

        description:
          "Return request rejected by support.",
      };
    }

    if (
      item.qc_status ===
      "passed"
    ) {
      return {
        icon: ShieldCheck,

        label:
          "Refund Approved",

        class:
          "bg-green-500/10 text-green-400 border-green-500/20",

        progress:
          "Ready For Refund",

        description:
          "Refund is now processing.",
      };
    }

    if (
      item.pickup_status ===
      "delivered_to_seller"
    ) {
      return {
        icon: Package,

        label:
          "Delivered To Seller",

        class:
          "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",

        progress:
          "Seller Inspection",

        description:
          "Return delivered to seller warehouse.",
      };
    }

    if (
      item.pickup_status ===
      "in_transit"
    ) {
      return {
        icon: Truck,

        label:
          "In Transit",

        class:
          "bg-purple-500/10 text-purple-400 border-purple-500/20",

        progress:
          "Courier Transit",

        description:
          "Package moving to seller warehouse.",
      };
    }

    if (
      item.pickup_status ===
      "picked_up"
    ) {
      return {
        icon: Truck,

        label:
          "Picked Up",

        class:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",

        progress:
          "Picked By Courier",

        description:
          "Courier picked up your package.",
      };
    }

    if (
      item.pickup_status ===
      "pickup_scheduled"
    ) {
      return {
        icon: RotateCcw,

        label:
          "Pickup Scheduled",

        class:
          "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",

        progress:
          "Pickup Assigned",

        description:
          "Reverse pickup scheduled.",
      };
    }

    if (
      item.status ===
      "approved"
    ) {
      return {
        icon: CheckCircle2,

        label:
          "Approved",

        class:
          "bg-sky-500/10 text-sky-400 border-sky-500/20",

        progress:
          "Approved",

        description:
          "Return approved successfully.",
      };
    }

    return {
      icon: Clock3,

      label:
        "Under Review",

      class:
        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

      progress:
        "Pending Approval",

      description:
        "Marketplace team is reviewing your request.",
    };
  };

  return (
    <div className="max-w-7xl mx-auto p-5 md:p-8 space-y-8">

      {/* HERO */}

      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 md:p-12 text-white shadow-2xl">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.20),transparent_30%)]" />

        <div className="absolute -top-20 -right-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10">

          {/* LEFT */}

          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur text-sm font-semibold">

              <ShieldCheck className="w-4 h-4 text-green-400" />

              Secure Returns Protection
            </div>

            <h1 className="text-5xl md:text-7xl font-black mt-6 leading-tight tracking-tight">

              Returns
              <span className="text-green-400">
                {" & "}Refunds
              </span>

            </h1>

            <p className="text-zinc-300 text-lg md:text-xl leading-relaxed mt-6 max-w-2xl">

              Track return pickups, seller inspections
              and refund status for all your orders.
            </p>

            {/* FEATURES */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">

              <FeatureCard
                icon={RotateCcw}
                title="Easy Returns"
                description="Simple return experience"
              />

              <FeatureCard
                icon={Wallet}
                title="Fast Refunds"
                description="Quick UPI & bank refunds"
              />

              <FeatureCard
                icon={ShieldCheck}
                title="Protected"
                description="Safe & secure refund flow"
              />
            </div>
          </div>

          {/* RIGHT */}

          <div className="w-full xl:w-[430px] rounded-[36px] bg-white/10 backdrop-blur-2xl border border-white/10 p-7 shadow-2xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-white/70">
                  Total Completed Refunds
                </p>

                <div className="flex items-center mt-3">

                  <IndianRupee className="w-10 h-10" />

                  <h2 className="text-5xl font-black">
                    {returns
                      ?.filter(
                        (r: any) =>
                          r.status ===
                          "completed"
                      )
                      .reduce(
                        (
                          acc: number,
                          item: any
                        ) =>
                          acc +
                          Number(
                            item.refund_amount ||
                              item
                                .order_items
                                ?.final_price ||
                              0
                          ),
                        0
                      )
                      .toLocaleString(
                        "en-IN"
                      )}
                  </h2>
                </div>
              </div>

              <div className="w-16 h-16 rounded-3xl bg-green-500/20 flex items-center justify-center">

                <CreditCard className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="space-y-4 mt-8">

              <BenefitCard
                icon={CheckCircle2}
                title="Live Return Tracking"
                description="Track reverse pickup progress"
              />

              <BenefitCard
                icon={Sparkles}
                title="Seller QC Updates"
                description="Real-time inspection updates"
              />

              <BenefitCard
                icon={Smartphone}
                title="UPI Supported"
                description="GPay, PhonePe & Paytm"
              />
            </div>

            <Link
              href="/dashboard/user/banks"
              className="mt-7 w-full h-14 rounded-2xl bg-white text-zinc-900 font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
            >

              Manage Banks & UPI

              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        <StatCard
          title="Total Returns"
          value={totalReturns}
          icon={RotateCcw}
        />

        <StatCard
          title="Pending"
          value={pendingReturns}
          icon={Clock3}
        />

        <StatCard
          title="Processing"
          value={processingReturns}
          icon={Truck}
        />

        <StatCard
          title="Completed"
          value={completedReturns}
          icon={CheckCircle2}
        />
      </div>

      {/* EMPTY */}

      {!returns?.length && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-20 text-center">

          <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">

            <Package className="w-12 h-12 text-zinc-400" />
          </div>

          <h2 className="text-3xl font-black text-zinc-900 dark:text-white mt-8">
            No Returns Yet
          </h2>

          <p className="text-zinc-500 mt-3 max-w-md mx-auto">
            Your return requests and refund updates will appear here.
          </p>
        </div>
      )}

      {/* RETURNS */}

      <div className="space-y-7">

        {returns?.map(
          (item: any) => {

            const statusUI =
              getStatusUI(item);

            const StatusIcon =
              statusUI.icon;

            const refundAccount =
              item.users
                ?.customer_refund_accounts?.find(
                  (a: any) =>
                    a.is_default
                ) ||
              item.users
                ?.customer_refund_accounts?.[0];

            const image =
              item.order_items?.products?.product_images?.find(
                (i: any) =>
                  i.is_primary
              )?.url ||
              item.order_items
                ?.products
                ?.product_images?.[0]
                ?.url ||
              "/placeholder.png";

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300"
              >

                <div className="p-6 md:p-8">

                  <div className="flex flex-col 2xl:flex-row gap-8">

                    {/* LEFT */}

                    <div className="flex-1">

                      <div className="flex flex-col md:flex-row gap-6">

                        {/* IMAGE */}

                        <div className="relative shrink-0">

                          <img
                            src={image}
                            alt=""
                            className="w-40 h-40 rounded-[28px] object-cover border border-zinc-200 dark:border-zinc-800"
                          />

                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur text-white text-xs font-semibold">

                            {
                              item.return_type ||
                              item.type
                            }
                          </div>
                        </div>

                        {/* INFO */}

                        <div className="flex-1">

                          {/* STATUS */}

                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold ${statusUI.class}`}
                          >

                            <StatusIcon className="w-4 h-4" />

                            {statusUI.label}
                          </div>

                          {/* PRODUCT */}

                          <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mt-5 leading-tight">

                            {
                              item
                                .order_items
                                ?.product_name
                            }
                          </h2>

                          {/* META */}

                          <div className="flex flex-wrap gap-5 mt-5 text-sm text-zinc-500">

                            <p>
                              Order:
                              <span className="ml-1 font-semibold text-zinc-700 dark:text-zinc-300">

                                {
                                  item.orders
                                    ?.order_code
                                }
                              </span>
                            </p>

                            <p>
                              Qty:
                              <span className="ml-1 font-semibold text-zinc-700 dark:text-zinc-300">

                                {
                                  item
                                    .order_items
                                    ?.quantity
                                }
                              </span>
                            </p>

                            <p>
                              Status:
                              <span className="ml-1 font-semibold text-zinc-700 dark:text-zinc-300">

                                {
                                  statusUI.progress
                                }
                              </span>
                            </p>
                          </div>

                          {/* REASON */}

                          <div className="mt-6">

                            <p className="text-sm text-zinc-500">
                              Return Reason
                            </p>

                            <p className="font-bold text-zinc-900 dark:text-white mt-1">

                              {item.reason}
                            </p>
                          </div>

                          {/* DESCRIPTION */}

                          {item.description && (
                            <div className="mt-5">

                              <p className="text-sm text-zinc-500">
                                Description
                              </p>

                              <p className="text-zinc-700 dark:text-zinc-300 mt-2 leading-relaxed">

                                {
                                  item.description
                                }
                              </p>
                            </div>
                          )}

                          {/* REJECT */}

                          {item.reject_reason && (
                            <div className="mt-6 p-5 rounded-3xl bg-red-500/10 border border-red-500/20">

                              <div className="flex items-center gap-2 text-red-400 font-bold">

                                <AlertTriangle className="w-5 h-5" />

                                Rejection Reason
                              </div>

                              <p className="mt-3 text-sm text-zinc-300">

                                {
                                  item.reject_reason
                                }
                              </p>
                            </div>
                          )}

                          {/* QC NOTES */}

                          {item.qc_notes && (
                            <div className="mt-6 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">

                              <div className="flex items-center gap-2 text-emerald-400 font-bold">

                                <ShieldCheck className="w-5 h-5" />

                                QC Notes
                              </div>

                              <p className="mt-3 text-sm text-zinc-300">

                                {item.qc_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div className="2xl:w-[330px] flex flex-col gap-5">

                      {/* REFUND */}

                      <div className="rounded-[32px] bg-gradient-to-br from-green-600 to-emerald-700 p-7 text-white shadow-xl">

                        <p className="text-white/80 text-sm">
                          Refund Amount
                        </p>

                        <div className="flex items-center mt-3">

                          <IndianRupee className="w-9 h-9" />

                          <h3 className="text-5xl font-black">

                            {Number(
                              item.refund_amount ||
                                item
                                  .order_items
                                  ?.final_price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </h3>
                        </div>

                        <div className="mt-5 h-[1px] bg-white/20" />

                        {/* DESTINATION */}

                        <div className="mt-5">

                          <p className="text-sm text-white/70 mb-3">
                            Refund Method
                          </p>

                          {item.orders
                            ?.payment_method ===
                          "online" ? (

                            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">

                              <div className="flex items-center gap-3">

                                <Wallet className="w-5 h-5" />

                                <div>

                                  <p className="font-semibold">
                                    Original Payment Method
                                  </p>

                                  <p className="text-xs text-white/70 mt-1">
                                    Refund will be credited automatically
                                  </p>
                                </div>
                              </div>
                            </div>

                          ) : refundAccount ? (

                            <div className="space-y-3">

                              {refundAccount.upi_id && (
                                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">

                                  <div className="flex items-center gap-3">

                                    <Wallet className="w-5 h-5" />

                                    <div>

                                      <p className="font-semibold">
                                        Refunded To UPI
                                      </p>

                                      <p className="text-sm text-white/80 mt-1 break-all">

                                        {
                                          refundAccount.upi_id
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {refundAccount.bank_name && (
                                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">

                                  <div className="flex items-center gap-3">

                                    <Landmark className="w-5 h-5" />

                                    <div>

                                      <p className="font-semibold">
                                        Bank Transfer
                                      </p>

                                      <p className="text-sm text-white/80 mt-1">

                                        XXXX
                                        {refundAccount.account_number?.slice(
                                          -4
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                          ) : (

                            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4">

                              <p className="text-yellow-200 text-sm">
                                No bank or UPI added yet.
                              </p>

                              <Link
                                href="/dashboard/user/banks"
                                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white"
                              >

                                Add Bank & UPI

                                <ArrowUpRight className="w-4 h-4" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* STATUS */}

                      <div
                        className={`rounded-[32px] border p-6 ${statusUI.class}`}
                      >

                        <div className="flex items-center gap-3 font-bold text-lg">

                          <StatusIcon className="w-6 h-6" />

                          {statusUI.label}
                        </div>

                        <p className="mt-3 text-sm leading-relaxed opacity-90">

                          {statusUI.description}
                        </p>

                        {item.pickup_tracking_url && (
                          <a
                            href={
                              item.pickup_tracking_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 w-full h-12 rounded-2xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center font-semibold"
                          >
                            Track Pickup
                          </a>
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div className="grid grid-cols-1 gap-3">

                        <Link
                          href={`/dashboard/user/orders/${item.orders?.order_code}`}
                          className="h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center font-bold text-zinc-900 dark:text-white"
                        >
                          View Order
                        </Link>

                        <Link
                          href="/dashboard/user/banks"
                          className="h-14 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-2 font-semibold text-zinc-900 dark:text-white"
                        >

                          <CreditCard className="w-5 h-5" />

                          Manage Banks & UPI
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

/* ============================= */
/* STAT CARD */
/* ============================= */

function StatCard({
  title,
  value,
  icon: Icon,
}: any) {

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 hover:shadow-lg transition-all duration-300">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-zinc-500 text-sm font-medium">
            {title}
          </p>

          <h2 className="text-5xl font-black text-zinc-900 dark:text-white mt-3">
            {value}
          </h2>
        </div>

        <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">

          <Icon className="w-8 h-8 text-zinc-900 dark:text-white" />
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* FEATURE */
/* ============================= */

function FeatureCard({
  icon: Icon,
  title,
  description,
}: any) {

  return (
    <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/10 p-5">

      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">

        <Icon className="w-6 h-6 text-white" />
      </div>

      <h3 className="font-bold mt-4">
        {title}
      </h3>

      <p className="text-sm text-white/70 mt-1 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/* ============================= */
/* BENEFIT */
/* ============================= */

function BenefitCard({
  icon: Icon,
  title,
  description,
}: any) {

  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">

      <div className="flex items-start gap-3">

        <Icon className="w-5 h-5 text-green-400 mt-0.5" />

        <div>

          <p className="font-semibold">
            {title}
          </p>

          <p className="text-sm text-white/70 mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}