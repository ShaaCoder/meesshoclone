import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  RotateCcw,
  Clock3,
  CheckCircle2,
  XCircle,
  Package,
  IndianRupee,
  AlertTriangle,
  ShieldCheck,
  Truck,
} from "lucide-react";

export default async function SellerReturnsPage() {
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
  /* SELLER CHECK */
  /* ============================= */

  const { data: profile } =
    await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    profile?.role !== "seller"
  ) {
    return redirect("/");
  }

  /* ============================= */
  /* FETCH RETURNS */
  /* ============================= */

  const { data: returns } =
    await supabaseAdmin
      .from("returns")
      .select(`
        *,

        orders (
          order_code
        ),

        users!returns_customer_id_fkey (
          name,
          email
        ),

        order_items (
          quantity,
          final_price,
          product_name,

          products (
            product_images (
              url,
              is_primary
            )
          )
        )
      `)
      .eq("seller_id", user.id)
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

  const approvedReturns =
    returns?.filter(
      (r: any) =>
        r.status ===
        "approved"
    ).length || 0;

  const rejectedReturns =
    returns?.filter(
      (r: any) =>
        r.status ===
        "rejected"
    ).length || 0;

  const totalLoss =
    returns?.reduce(
      (
        sum: number,
        r: any
      ) =>
        sum +
        Number(
          r.refund_amount ||
            r.order_items
              ?.final_price ||
            0
        ),
      0
    ) || 0;

  /* ============================= */
  /* STATUS UI */
  /* ============================= */

  const getStatusUI = (
    item: any
  ) => {

    /* ============================= */
    /* QC FAILED */
    /* ============================= */

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

        description:
          "Returned product failed quality check and refund is blocked.",
      };
    }

    /* ============================= */
    /* REJECTED */
    /* ============================= */

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

        description:
          "Marketplace admin rejected this return request.",
      };
    }

    /* ============================= */
    /* COMPLETED */
    /* ============================= */

    if (
      item.status ===
      "completed"
    ) {
      return {
        icon: CheckCircle2,

        label:
          "Refund Completed",

        class:
          "bg-green-500/10 text-green-400 border-green-500/20",

        description:
          "Refund has been released successfully to the customer.",
      };
    }

    /* ============================= */
    /* QC PASSED */
    /* ============================= */

    if (
      item.qc_status ===
      "passed"
    ) {
      return {
        icon: ShieldCheck,

        label:
          "QC Passed",

        class:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

        description:
          "Returned product passed quality inspection and refund is ready for release.",
      };
    }

    /* ============================= */
    /* DELIVERED TO SELLER */
    /* ============================= */

    if (
      item.pickup_status ===
        "delivered_to_seller" &&
      item.qc_status ===
        "pending"
    ) {
      return {
        icon: Package,

        label:
          "Product Received",

        class:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

        description:
          "Returned product reached your warehouse and is awaiting quality inspection.",
      };
    }

    /* ============================= */
    /* IN TRANSIT */
    /* ============================= */

    if (
      item.pickup_status ===
      "in_transit"
    ) {
      return {
        icon: Truck,

        label:
          "Return In Transit",

        class:
          "bg-purple-500/10 text-purple-400 border-purple-500/20",

        description:
          "Courier partner is transporting the returned product back to your warehouse.",
      };
    }

    /* ============================= */
    /* PICKED UP */
    /* ============================= */

    if (
      item.pickup_status ===
      "picked_up"
    ) {
      return {
        icon: Truck,

        label:
          "Picked Up",

        class:
          "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",

        description:
          "Courier partner picked up the product from the customer.",
      };
    }

    /* ============================= */
    /* PICKUP SCHEDULED */
    /* ============================= */

    if (
      item.pickup_status ===
      "pickup_scheduled"
    ) {
      return {
        icon: RotateCcw,

        label:
          "Pickup Scheduled",

        class:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",

        description:
          "Marketplace logistics team scheduled reverse pickup from customer.",
      };
    }

    /* ============================= */
    /* APPROVED */
    /* ============================= */

    if (
      item.status ===
      "approved"
    ) {
      return {
        icon: ShieldCheck,

        label:
          "Approved By Marketplace",

        class:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",

        description:
          "Marketplace approved this return request and reverse logistics process has started.",
      };
    }

    /* ============================= */
    /* REQUESTED */
    /* ============================= */

    return {
      icon: Clock3,

      label:
        "Waiting For Review",

      class:
        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

      description:
        "Customer submitted a return request and marketplace admin team is reviewing it.",
    };
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* HEADER */}

      <div>

        <h1 className="text-4xl font-black text-white">
          Product Returns
        </h1>

        <p className="text-zinc-500 mt-2">
          View customer return requests
        </p>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

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
          title="Approved"
          value={approvedReturns}
          icon={CheckCircle2}
        />

        <StatCard
          title="Rejected"
          value={rejectedReturns}
          icon={XCircle}
        />

        <StatCard
          title="Loss"
          value={`₹${totalLoss.toLocaleString(
            "en-IN"
          )}`}
          icon={IndianRupee}
        />
      </div>

      {/* EMPTY */}

      {!returns?.length && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-20 text-center">

          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">

            <Package className="w-10 h-10 text-zinc-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mt-6">
            No Return Requests
          </h2>

          <p className="text-zinc-500 mt-2">
            Return requests will appear here
          </p>
        </div>
      )}

      {/* RETURNS */}

      <div className="space-y-6">

        {returns?.map(
          (item: any) => {

            const statusUI =
              getStatusUI(item);

            const StatusIcon =
              statusUI.icon;

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
                className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden"
              >

                <div className="p-6 flex flex-col xl:flex-row gap-6">

                  {/* IMAGE */}

                  <img
                    src={image}
                    alt=""
                    className="w-36 h-36 rounded-3xl object-cover border border-zinc-800"
                  />

                  {/* INFO */}

                  <div className="flex-1">

                    <div className="flex flex-wrap items-center gap-3 mb-5">

                      <div
                        className={`px-4 py-2 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${statusUI.class}`}
                      >

                        <StatusIcon className="w-4 h-4" />

                        {statusUI.label}
                      </div>

                      <div className="px-4 py-2 rounded-2xl bg-zinc-800 text-sm text-zinc-300 capitalize">
                        {item.type}
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white leading-tight">
                      {
                        item
                          .order_items
                          ?.product_name
                      }
                    </h2>

                    <div className="flex flex-wrap gap-5 mt-4 text-sm text-zinc-500">

                      <p>
                        Order:{" "}
                        {
                          item.orders
                            ?.order_code
                        }
                      </p>

                      <p>
                        Qty:{" "}
                        {
                          item
                            .order_items
                            ?.quantity
                        }
                      </p>

                      <p>
                        Customer:{" "}
                        {
                          item.users
                            ?.name
                        }
                      </p>
                    </div>

                    {/* REASON */}

                    <div className="mt-5">

                      <p className="text-sm text-zinc-500">
                        Reason
                      </p>

                      <p className="text-white font-semibold mt-1">
                        {item.reason}
                      </p>
                    </div>

                    {/* DESCRIPTION */}

                    {item.description && (
                      <div className="mt-5">

                        <p className="text-sm text-zinc-500">
                          Description
                        </p>

                        <p className="text-zinc-300 mt-1">
                          {
                            item.description
                          }
                        </p>
                      </div>
                    )}


                  {/* RETURN IMAGES */}

{item.return_images?.length > 0 && (
  <div className="mt-5">

    <p className="text-sm text-zinc-500 mb-3">
      Customer Uploaded Images
    </p>

    <div className="flex flex-wrap gap-3">

      {item.return_images.map(
        (
          image: string,
          index: number
        ) => (
          <a
            key={index}
            href={image}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={image}
              alt=""
              className="w-24 h-24 rounded-2xl object-cover border border-zinc-800 hover:scale-105 transition"
            />
          </a>
        )
      )}
    </div>
  </div>
)}

                    {/* QC NOTES */}

                    {item.qc_notes && (
                      <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">

                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">

                          <ShieldCheck className="w-4 h-4" />

                          QC Notes
                        </div>

                        <p className="text-zinc-300 mt-2 text-sm">
                          {item.qc_notes}
                        </p>
                      </div>
                    )}

                    {/* REJECTION */}

                    {item.reject_reason && (
                      <div className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">

                        <div className="flex items-center gap-2 text-red-400 font-semibold">

                          <AlertTriangle className="w-4 h-4" />

                          Rejection Reason
                        </div>

                        <p className="text-zinc-300 mt-2 text-sm">
                          {
                            item.reject_reason
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT */}

                  <div className="xl:w-[260px] flex flex-col justify-between">

                    {/* REFUND */}

                    <div>

                      <p className="text-sm text-zinc-500">
                        Refund Amount
                      </p>

                      <h3 className="text-4xl font-black text-red-400 mt-2 flex items-center">
                        <IndianRupee className="w-7 h-7" />

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

                    {/* STATUS CARD */}

                    <div
                      className={`rounded-2xl border p-5 mt-6 ${statusUI.class}`}
                    >

                      <div className="flex items-center gap-2 font-semibold">

                        <StatusIcon className="w-5 h-5" />

                        {statusUI.label}
                      </div>

                      <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                        {statusUI.description}
                      </p>

                      {/* TRACK */}

                      {item.pickup_tracking_url && (
                        <a
                          href={
                            item.pickup_tracking_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white font-semibold"
                        >
                          Track Return Shipment
                        </a>
                      )}
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
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-zinc-500 text-sm">
            {title}
          </p>

          <h2 className="text-4xl font-black text-white mt-2">
            {value}
          </h2>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">

          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}