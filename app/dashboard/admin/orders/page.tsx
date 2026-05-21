// app/dashboard/admin/orders/page.tsx

import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabase-server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  markSellerPaid,
  createShipmentByAdmin,
  retryCourierAssign,
  updateOrderStatusByAdmin,
} from "@/app/actions/admin";

import { format } from "date-fns";

import {
  ShoppingBag,
  IndianRupee,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
  Wallet,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export default async function OrdersPage() {
  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* 🔐 ADMIN CHECK */
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
    profile?.role !==
    "admin"
  ) {
    return redirect("/login");
  }

  /* ============================= */
  /* 📦 FETCH ORDERS */
  /* ============================= */

  const {
    data: orders,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      addresses (
        name,
        city,
        state,
        phone
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <div className="p-10 text-red-500">
        {error.message}
      </div>
    );
  }

  /* ============================= */
  /* 📦 FETCH ORDER ITEMS */
  /* ============================= */

  const { data: items } =
    await supabaseAdmin
      .from("order_items")
      .select(`
        order_id,
        quantity,
        final_price,
        cost_price,
        status,

        products (
          name,

          product_images (
            url,
            is_primary
          )
        )
      `);

  /* ============================= */
  /* 🧠 GROUP ITEMS */
  /* ============================= */

  const map: Record<
    string,
    any[]
  > = {};

  (items || []).forEach(
    (item: any) => {
      if (
        !map[item.order_id]
      ) {
        map[item.order_id] =
          [];
      }

      map[item.order_id].push(
        item
      );
    }
  );

  /* ============================= */
  /* 📊 STATS */
  /* ============================= */

  let revenue = 0;

  let profit = 0;

  (
    orders || []
  ).forEach((order: any) => {
    if (
      order.payment_status ===
      "paid"
    ) {
      revenue += Number(
        order.total_amount ||
          0
      );

      const orderItems =
        map[order.id] || [];

      orderItems.forEach(
        (item: any) => {
          profit +=
            (Number(
              item.final_price ||
                0
            ) -
              Number(
                item.cost_price ||
                  0
              )) *
            Number(
              item.quantity ||
                0
            );
        }
      );
    }
  });

  const paidOrders =
    orders?.filter(
      (o: any) =>
        o.payment_status ===
        "paid"
    ).length || 0;

  /* ============================= */
  /* 🎨 STATUS UI */
  /* ============================= */

  const getStatusStyles = (
    status: string
  ) => {
    switch (status) {
      case "placed":
      case "pending":
        return {
          className:
            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          icon: Clock3,
        };

      case "accepted":
      case "processing":
        return {
          className:
            "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: Package,
        };

      case "shipped":
      case "out_for_delivery":
        return {
          className:
            "bg-purple-500/10 text-purple-400 border-purple-500/20",
          icon: Truck,
        };

      case "delivered":
        return {
          className:
            "bg-green-500/10 text-green-400 border-green-500/20",
          icon: CheckCircle2,
        };

      case "cancelled":
        return {
          className:
            "bg-red-500/10 text-red-400 border-red-500/20",
          icon: XCircle,
        };

      default:
        return {
          className:
            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
          icon: Clock3,
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER */}

      <div>
        <h1 className="text-4xl font-black text-white">
          Orders
          Management
        </h1>

        <p className="text-zinc-500 mt-2">
          Manage
          shipments,
          payouts and
          deliveries
        </p>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Stat
          title="Total Orders"
          value={
            orders?.length ||
            0
          }
          icon={ShoppingBag}
        />

        <Stat
          title="Revenue"
          value={`₹${revenue}`}
          icon={
            IndianRupee
          }
        />

        <Stat
          title="Profit"
          value={`₹${profit}`}
          icon={Wallet}
        />

        <Stat
          title="Paid Orders"
          value={paidOrders}
          icon={
            CheckCircle2
          }
        />
      </div>

      {/* ORDERS */}

      <div className="space-y-6">
        {orders?.map(
          (order: any) => {
            const orderItems =
              map[
                order.id
              ] || [];

            const orderProfit =
              orderItems.reduce(
                (
                  sum: number,
                  item: any
                ) =>
                  sum +
                  (Number(
                    item.final_price ||
                      0
                  ) -
                    Number(
                      item.cost_price ||
                        0
                    )) *
                    Number(
                      item.quantity ||
                        0
                    ),
                0
              );

            const statusUI =
              getStatusStyles(
                order.status
              );

            const StatusIcon =
              statusUI.icon;

            const isCourierPending =
              order.courier_name ===
              "Pending Assignment";

            return (
              <div
                key={
                  order.id
                }
                className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[30px] overflow-hidden"
              >
                {/* TOP */}

                <div className="p-6 border-b border-zinc-800">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    {/* LEFT */}

                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
                          <Package className="w-7 h-7 text-white" />
                        </div>

                        <div>
                          <h2 className="text-2xl font-bold text-white">
                            {order.order_code ||
                              order.id}
                          </h2>

                          <p className="text-zinc-500 text-sm mt-1">
                            {format(
                              new Date(
                                order.created_at
                              ),
                              "dd MMM yyyy • hh:mm a"
                            )}
                          </p>
                        </div>
                      </div>

                      {/* ADDRESS */}

                      <div className="mt-5 text-sm text-zinc-400 space-y-1">
                        <p>
                          {
                            order
                              .addresses
                              ?.name
                          }
                        </p>

                        <p>
                          {
                            order
                              .addresses
                              ?.city
                          }
                          ,{" "}
                          {
                            order
                              .addresses
                              ?.state
                          }
                        </p>

                        <p>
                          {
                            order
                              .addresses
                              ?.phone
                          }
                        </p>
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div className="flex flex-col items-start xl:items-end gap-4">
                      <div className="text-left xl:text-right">
                        <p className="text-zinc-500 text-sm">
                          Order
                          Amount
                        </p>

                        <p className="text-white text-3xl font-black">
                          ₹
                          {
                            order.total_amount
                          }
                        </p>
                      </div>

                      <div className="text-left xl:text-right">
                        <p className="text-zinc-500 text-sm">
                          Profit
                        </p>

                        <p className="text-green-400 text-2xl font-bold">
                          ₹
                          {
                            orderProfit
                          }
                        </p>
                      </div>

                      {/* STATUS */}

                      <div
                        className={`px-4 py-2 rounded-full border text-sm font-semibold capitalize inline-flex items-center gap-2 ${statusUI.className}`}
                      >
                        <StatusIcon className="w-4 h-4" />

                        {String(
                          order.status
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ITEMS */}

                <div className="p-6 space-y-4">
                  {orderItems.map(
                    (
                      item: any,
                      index: number
                    ) => {
                      const image =
                        item.products?.product_images?.find(
                          (
                            i: any
                          ) =>
                            i.is_primary
                        )?.url ||
                        item
                          .products
                          ?.product_images?.[0]
                          ?.url ||
                        "/placeholder.png";

                      return (
                        <div
                          key={
                            index
                          }
                          className="bg-black/30 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
                        >
                          <img
                            src={
                              image
                            }
                            alt=""
                            className="w-20 h-20 rounded-2xl object-cover"
                          />

                          <div className="flex-1">
                            <h3 className="text-white font-semibold">
                              {
                                item
                                  .products
                                  ?.name
                              }
                            </h3>

                            <p className="text-zinc-500 text-sm mt-1">
                              Qty:{" "}
                              {
                                item.quantity
                              }
                            </p>

                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 capitalize">
                              {
                                item.status
                              }
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-zinc-500 text-xs">
                              Profit
                            </p>

                            <p className="text-green-400 font-bold">
                              ₹
                              {(Number(
                                item.final_price
                              ) -
                                Number(
                                  item.cost_price
                                )) *
                                Number(
                                  item.quantity
                                )}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* FOOTER */}

                <div className="border-t border-zinc-800 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                  {/* PAYMENT */}

                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-xl bg-zinc-800 text-sm text-white capitalize">
                      {
                        order.payment_method
                      }
                    </div>

                    <div
                      className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                        order.payment_status ===
                        "paid"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {order.payment_status ===
                      "paid"
                        ? "Paid"
                        : "Unpaid"}
                    </div>

                    {order.seller_paid ? (
                      <div className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm font-semibold">
                        Seller
                        Paid
                      </div>
                    ) : (
                      <div className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-semibold">
                        Seller
                        Pending
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}


<div className="flex flex-wrap gap-3">

  {/* ======================================= */}
  {/* CREATE SHIPMENT */}
  {/* ======================================= */}

  {order.payment_status === "paid" &&
    order.status === "accepted" &&
    !order.shipment_id && (
      <form
        action={async () => {
          "use server";

          await createShipmentByAdmin(
            order.id
          );
        }}
      >
        <button className="bg-white text-black hover:bg-zinc-200 px-5 py-3 rounded-2xl font-semibold transition">
          Create Shipment
        </button>
      </form>
    )}

  {/* ======================================= */}
  {/* RETRY COURIER */}
  {/* ======================================= */}

  {isCourierPending &&
    order.shipment_id && (
      <form
        action={async () => {
          "use server";

          await retryCourierAssign(
            order.id
          );
        }}
      >
        <button className="bg-yellow-500 text-black hover:bg-yellow-400 px-5 py-3 rounded-2xl font-semibold transition flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />

          Retry Courier
        </button>
      </form>
    )}

  {/* ======================================= */}
  {/* TRACK */}
  {/* ======================================= */}

  {order.awb_code && (
    <a
      href={
        order.tracking_url ||
        "#"
      }
      target="_blank"
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold transition flex items-center gap-2"
    >
      <Truck className="w-4 h-4" />

      Track
    </a>
  )}

  {/* ======================================= */}
  {/* MARK SHIPPED */}
  {/* ======================================= */}

  {order.status ===
    "accepted" &&
    order.shipment_id && (
      <form
        action={async () => {
          "use server";

          await updateOrderStatusByAdmin(
            order.id,
            "shipped"
          );
        }}
      >
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl font-semibold transition">
          Mark Shipped
        </button>
      </form>
    )}

  {/* ======================================= */}
  {/* OUT FOR DELIVERY */}
  {/* ======================================= */}

  {order.status ===
    "shipped" && (
      <form
        action={async () => {
          "use server";

          await updateOrderStatusByAdmin(
            order.id,
            "out_for_delivery"
          );
        }}
      >
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-semibold transition">
          Out For Delivery
        </button>
      </form>
    )}

  {/* ======================================= */}
  {/* DELIVERED */}
  {/* ======================================= */}

  {order.status ===
    "out_for_delivery" && (
      <form
        action={async () => {
          "use server";

          await updateOrderStatusByAdmin(
            order.id,
            "delivered"
          );
        }}
      >
        <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl font-semibold transition">
          Mark Delivered
        </button>
      </form>
    )}

  {/* ======================================= */}
  {/* PAY SELLER */}
  {/* ======================================= */}

  {order.payment_status ===
    "paid" &&
    order.status ===
      "delivered" &&
    !order.seller_paid && (
      <form
        action={async () => {
          "use server";

          await markSellerPaid(
            order.id
          );
        }}
      >
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-semibold transition">
          Pay Seller
        </button>
      </form>
    )}

  {/* ======================================= */}
  {/* COMPLETED */}
  {/* ======================================= */}

  {order.status ===
    "delivered" &&
    order.seller_paid && (
      <div className="bg-green-500/10 text-green-400 px-5 py-3 rounded-2xl font-semibold">
        Completed
      </div>
    )}
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
/* 📊 STAT CARD */
/* ============================= */

function Stat({
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

          <h2 className="text-3xl font-black text-white mt-2">
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