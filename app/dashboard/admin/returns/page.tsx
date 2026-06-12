import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  adminApproveReturn,
  rejectReturn,
  completeReturn,
  passReturnQC,
  failReturnQC,
  markReturnPickedUp,
  markReturnInTransit,
  markReturnDelivered,
} from "@/app/actions/returns";

import {
  RotateCcw,
  Clock3,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";

export default async function AdminReturnsPage() {
  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* ADMIN CHECK */
  /* ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } =
    await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    profile?.role !== "admin"
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
  email,

  customer_refund_accounts (
    id,
    account_holder_name,
    bank_name,
    account_number,
    ifsc_code,
    upi_id,
    phone,
    is_default
  )
),

        order_items (
  quantity,
  final_price,
  product_name,

  product_variants (
    color,
    size
  ),

  products (
    product_images (
      url,
      color,
      is_primary
    )
  )
)
      `)
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

  const completedReturns =
    returns?.filter(
      (r: any) =>
        r.status ===
        "completed"
    ).length || 0;

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
        "Returned product failed quality inspection.",
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
        "Marketplace rejected this return request.",
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
      icon:
        CheckCircle2,

      label:
        "Refund Completed",

      class:
        "bg-green-500/10 text-green-400 border-green-500/20",

      description:
        "Refund processed successfully and return lifecycle completed.",
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
      icon:
        CheckCircle2,

      label:
        "QC Passed",

      class:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

      description:
        "Product passed quality inspection and refund is ready.",
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
        "Delivered To Seller",

      class:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

      description:
        "Returned product reached seller warehouse and is awaiting QC.",
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
        "Courier partner is transporting the returned item back to seller.",
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
        "Courier partner picked up the return package from customer.",
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
      icon:
        RotateCcw,

      label:
        "Pickup Scheduled",

      class:
        "bg-blue-500/10 text-blue-400 border-blue-500/20",

      description:
        "Reverse pickup scheduled with logistics partner.",
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
      icon:
        CheckCircle2,

      label:
        "Approved",

      class:
        "bg-blue-500/10 text-blue-400 border-blue-500/20",

      description:
        "Return approved and reverse logistics initiated.",
    };
  }

  /* ============================= */
  /* REQUESTED */
  /* ============================= */

  return {
    icon: Clock3,

    label:
      "Pending Review",

    class:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

    description:
      "Customer submitted return request awaiting admin review.",
  };
};
function getVariantImage(
  item: any
) {

  const variantColor =
    item.order_items
      ?.product_variants
      ?.color;

  const images =
    item.order_items
      ?.products
      ?.product_images || [];

  /* ============================= */
  /* 🎨 COLOR MATCH */
  /* ============================= */

  if (variantColor) {

    const matched =
      images.find(
        (img: any) => {

          if (!img?.color) {
            return false;
          }

          return (
            String(
              img.color
            ).toLowerCase() ===
            String(
              variantColor
            ).toLowerCase()
          );
        }
      );

    if (matched?.url) {
      return matched.url;
    }
  }

  /* ============================= */
  /* ⭐ PRIMARY */
  /* ============================= */

  const primary =
    images.find(
      (img: any) =>
        img.is_primary
    );

  if (primary?.url) {
    return primary.url;
  }

  /* ============================= */
  /* 📦 FIRST */
  /* ============================= */

  if (images?.[0]?.url) {
    return images[0].url;
  }

  return "/placeholder.png";
}
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* HEADER */}

      <div>

        <h1 className="text-4xl font-black text-white">
          Returns Management
        </h1>

        <p className="text-zinc-500 mt-2">
          Manage customer return requests
        </p>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-20 text-center">

          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">

            <Package className="w-10 h-10 text-zinc-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mt-6">
            No Return Requests
          </h2>

          <p className="text-zinc-500 mt-2">
            Returns will appear here
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
  getVariantImage(item);
              const refundAccount =
  item.users
    ?.customer_refund_accounts?.find(
      (a: any) => a.is_default
    ) ||
  item.users
    ?.customer_refund_accounts?.[0];
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

                      <div className="px-4 py-2 rounded-2xl bg-zinc-800 text-sm text-zinc-300">
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

                    {/* QC NOTES */}

                    {item.qc_notes && (
                      <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">

                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">

                          <CheckCircle2 className="w-4 h-4" />

                          QC Notes
                        </div>

                        <p className="text-zinc-300 mt-2 text-sm">
                          {item.qc_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT */}

                  <div className="xl:w-[240px] flex flex-col justify-between">

                    {/* PRICE */}

                    <div>

                      <p className="text-sm text-zinc-500">
                        Refund Amount
                      </p>

                      <h3 className="text-4xl font-black text-green-400 mt-2 flex items-center">
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

                 {/* RETURN FLOW */}

<div className="space-y-4 mt-6">

  {/* STATUS CARD */}

  <div
    className={`rounded-2xl border p-5 ${statusUI.class}`}
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

  {/* REQUESTED */}

  {item.status ===
    "requested" && (
    <div className="space-y-3">

      <form
        action={async () => {
          "use server";

          await adminApproveReturn(
            item.id
          );
        }}
      >
        <button className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-white font-semibold">
          Approve Return
        </button>
      </form>

      <form
        action={async () => {
          "use server";

          await rejectReturn(
            item.id
          );
        }}
      >
        <button className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 transition text-white font-semibold">
          Reject Return
        </button>
      </form>
    </div>
  )}

  {/* PICKUP SCHEDULED */}

  {item.pickup_status ===
    "pickup_scheduled" &&
    item.status !==
      "completed" && (
      <form
        action={async () => {
          "use server";

          await markReturnPickedUp(
            item.id
          );
        }}
      >
        <button className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-700 transition text-white font-semibold">
          Mark Picked Up
        </button>
      </form>
    )}

  {/* PICKED UP */}

  {item.pickup_status ===
    "picked_up" &&
    item.status !==
      "completed" && (
      <form
        action={async () => {
          "use server";

          await markReturnInTransit(
            item.id
          );
        }}
      >
        <button className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 transition text-white font-semibold">
          Mark In Transit
        </button>
      </form>
    )}

  {/* IN TRANSIT */}

  {item.pickup_status ===
    "in_transit" &&
    item.status !==
      "completed" && (
      <form
        action={async () => {
          "use server";

          await markReturnDelivered(
            item.id
          );
        }}
      >
        <button className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold">
          Delivered To Seller
        </button>
      </form>
    )}

  {/* QC PENDING */}

  {item.pickup_status ===
    "delivered_to_seller" &&
    item.qc_status ===
      "pending" &&
    item.status !==
      "completed" && (
      <div className="space-y-3">

        <form
          action={async () => {
            "use server";

            await passReturnQC(
              item.id
            );
          }}
        >
          <button className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 transition text-white font-semibold">
            Pass QC
          </button>
        </form>

        <form
          action={async () => {
            "use server";

            await failReturnQC(
              item.id
            );
          }}
        >
          <button className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 transition text-white font-semibold">
            Fail QC
          </button>
        </form>
      </div>
    )}
  {/* REFUND ACCOUNT */}

{refundAccount && (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

    <h3 className="text-white font-bold mb-4">
      Refund Account
    </h3>

    <div className="space-y-2 text-sm">

      {refundAccount.account_holder_name && (
        <p className="text-zinc-300">
          Name:{" "}
          <span className="text-white">
            {
              refundAccount.account_holder_name
            }
          </span>
        </p>
      )}

      {refundAccount.bank_name && (
        <p className="text-zinc-300">
          Bank:{" "}
          <span className="text-white">
            {refundAccount.bank_name}
          </span>
        </p>
      )}

      {refundAccount.account_number && (
        <p className="text-zinc-300">
          A/C:{" "}
          <span className="text-white">
            XXXX
            {refundAccount.account_number.slice(
              -4
            )}
          </span>
        </p>
      )}

      {refundAccount.ifsc_code && (
        <p className="text-zinc-300">
          IFSC:{" "}
          <span className="text-white">
            {refundAccount.ifsc_code}
          </span>
        </p>
      )}

      {refundAccount.upi_id && (
        <p className="text-zinc-300">
          UPI:{" "}
          <span className="text-green-400 font-medium">
            {refundAccount.upi_id}
          </span>
        </p>
      )}

      {refundAccount.phone && (
        <p className="text-zinc-300">
          Phone:{" "}
          <span className="text-white">
            {refundAccount.phone}
          </span>
        </p>
      )}

    </div>
  </div>
)}
  {/* QC PASSED */}

  {item.pickup_status ===
    "delivered_to_seller" &&
    item.qc_status ===
      "passed" &&
    item.status !==
      "completed" && (
      <form
        action={async () => {
          "use server";

          await completeReturn(
            item.id
          );
        }}
      >
        <button className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 transition text-white font-semibold">
         Mark Refunded
        </button>
      </form>
    )}

  {/* QC FAILED */}

  {item.qc_status ===
    "failed" && (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">

      <div className="flex items-center gap-2 text-red-400 font-semibold">

        <XCircle className="w-5 h-5" />

        QC Failed
      </div>

      <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
        Product failed quality check.
        Refund has been blocked and
        return marked for manual review.
      </p>
    </div>
  )}

  {/* COMPLETED */}

  {item.status ===
    "completed" && (
    <div className="w-full h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center font-semibold">
      Refund Completed
    </div>
  )}

  {/* REJECTED */}

  {item.status ===
    "rejected" && (
    <div className="w-full h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center font-semibold">
      Return Rejected
    </div>
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