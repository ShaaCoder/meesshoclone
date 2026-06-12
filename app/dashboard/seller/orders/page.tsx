import { format } from "date-fns";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  IndianRupee,
  Package,
  Printer,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import OrderStats from "@/components/dashboard/seller/order-stats";
import {
  acceptOrder,
  updateOrderStatus,
} from "@/app/actions/seller";

export default async function SellerOrdersPage() {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  /* ============================= */
  /* 📦 FETCH ORDER ITEMS */
  /* ============================= */

  const {
    data: items,
    error,
  } = await supabaseAdmin
    .from("order_items")
    .select(`
      id,
      order_id,
      quantity,
      final_price,
      cost_price,
      seller_earning,
      status,
      accepted_at,
      processing_at,
      shipped_at,
      delivered_at,
      cancelled_at,
      out_for_delivery_at,
      tracking_id,
      courier_name,

      products (
        id,
        name,

        product_images (
          url,
          is_primary
        )
      ),

      orders (
        id,
        order_code,
        payment_status,
        payment_method,
        total_amount,
        created_at,
        status,
        awb_code,
        courier_name,
        tracking_url
      )
    `)
    .eq("seller_id", user.id)
    .order("created_at", {
      foreignTable:
        "orders",
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
  /* 📦 GROUP ORDERS */
  /* ============================= */

  const grouped: Record<
    string,
    any
  > = {};

  items?.forEach(
    (item: any) => {
      if (!item.orders)
        return;

      if (
        !grouped[
          item.order_id
        ]
      ) {
        grouped[
          item.order_id
        ] = {
          ...item.orders,
          items: [],
        };
      }

      grouped[
        item.order_id
      ].items.push(item);
    }
  );

  const orders =
    Object.values(grouped);

  /* ============================= */
  /* 🎨 STATUS UI */
  /* ============================= */

  const getStatusStyles = (
    status: string
  ) => {
    switch (status) {
      case "placed":
        return {
          color:
            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          icon: Clock3,
        };

      case "processing":
      case "accepted":
        return {
          color:
            "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: Package,
        };

      case "shipped":
      case "out_for_delivery":
        return {
          color:
            "bg-purple-500/10 text-purple-400 border-purple-500/20",
          icon: Truck,
        };

      case "delivered":
        return {
          color:
            "bg-green-500/10 text-green-400 border-green-500/20",
          icon: CheckCircle2,
        };

      case "cancelled":
        return {
          color:
            "bg-red-500/10 text-red-400 border-red-500/20",
          icon: XCircle,
        };

      default:
        return {
          color:
            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
          icon: Clock3,
        };
    }
  };

  /* ============================= */
  /* 🚫 EMPTY */
  /* ============================= */
const stats = {
  total: items.length,

  processing: items.filter(
    (i: any) =>
      i.status === "processing" ||
      i.status === "accepted"
  ).length,

  shipped: items.filter(
    (i: any) =>
      i.status === "shipped" ||
      i.status === "out_for_delivery"
  ).length,

  delivered: items.filter(
    (i: any) =>
      i.status === "delivered"
  ).length,

  returns: items.filter(
    (i: any) =>
      i.status === "returned" ||
      i.status === "return_requested"
  ).length,

  cancelled: items.filter(
    (i: any) =>
      i.status === "cancelled"
  ).length,
};
  if (!orders.length) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[32px] p-20 text-center shadow-2xl">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10 text-zinc-500" />
          </div>

          <h2 className="text-3xl font-bold text-white mt-8">
            No Orders Yet
          </h2>

          <p className="text-zinc-500 mt-3 max-w-md mx-auto">
            Customer orders
            will appear here
            once customers start
            purchasing your
            products.
          </p>
        </div>
      </div>
    );
  }

  /* ============================= */
  /* ✅ PAGE */
  /* ============================= */

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER */}

      <div className="flex items-center justify-between">
      

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
  
  {/* LEFT */}
  <div>
    <h1 className="text-4xl font-black text-white">
      Seller Orders
    </h1>

    <p className="text-zinc-500 mt-2">
      Manage shipments,
      invoices and customer orders
    </p>
  </div>

  {/* RIGHT */}
  <OrderStats items={items || []} />
</div>
      </div>

      {/* ORDERS */}

      <div className="space-y-6">
        {orders.map(
          (order: any) => {
            /* ============================= */
            /* 💰 SELLER TOTAL */
            /* ============================= */

            const sellerTotal =
              order.items.reduce(
                (
                  sum: number,
                  item: any
                ) =>
                  sum +
                  Number(
                    item.seller_earning ||
                      0
                  ),
                0
              );

            /* ============================= */
            /* 📦 TOTAL QTY */
            /* ============================= */

            const totalQty =
              order.items.reduce(
                (
                  sum: number,
                  item: any
                ) =>
                  sum +
                  Number(
                    item.quantity ||
                      0
                  ),
                0
              );

            return (
              <div
                key={
                  order.id
                }
                className="group bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-[30px] overflow-hidden transition-all duration-300"
              >
                {/* TOP */}

                <div className="p-7 border-b border-zinc-800">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    {/* LEFT */}

                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
                        <Package className="w-8 h-8 text-white" />
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {order.order_code}
                        </h2>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-500">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />

                            {format(
                              new Date(
                                order.created_at
                              ),
                              "dd MMM yyyy • hh:mm a"
                            )}
                          </div>

                          <div>
                            {
                              totalQty
                            }{" "}
                            item
                            {totalQty >
                            1
                              ? "s"
                              : ""}
                          </div>

                          <div className="capitalize">
                            {
                              order.payment_method
                            }
                          </div>

                          <div
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                              order.payment_status ===
                              "paid"
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {
                              order.payment_status
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div className="text-left xl:text-right">
                      <p className="text-zinc-500 text-sm">
                        Seller Earnings
                      </p>

                      <div className="flex items-center gap-1 text-green-400 font-black text-3xl">
                        <IndianRupee className="w-6 h-6" />

                        {sellerTotal}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ITEMS */}

                <div className="p-7 space-y-5">
                  {order.items.map(
                    (
                      item: any
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

                      const statusUI =
                        getStatusStyles(
                          item.status
                        );

                      const StatusIcon =
                        statusUI.icon;

                      return (
                        <div
                          key={
                            item.id
                          }
                          className="bg-black/30 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                            {/* IMAGE */}

                            <div className="relative">
                              <img
                                src={
                                  image
                                }
                                alt={
                                  item
                                    .products
                                    ?.name
                                }
                                className="w-24 h-24 rounded-2xl object-cover border border-zinc-800"
                              />

                              <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold px-2 py-1 rounded-full">
                                x
                                {
                                  item.quantity
                                }
                              </div>
                            </div>

                            {/* INFO */}

                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold text-xl truncate">
                                {
                                  item
                                    .products
                                    ?.name
                                }
                              </h3>

                              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-500">
                                <span>
                                  Selling
                                  Price:
                                  ₹
                                  {
                                    item.final_price
                                  }
                                </span>

                                <span>
                                  Your
                                  Earnings:
                                  ₹
                                  {
                                    item.seller_earning
                                  }
                                </span>
                              </div>

                              {/* STATUS */}

                              <div
                                className={`mt-4 inline-flex items-center gap-2 border px-4 py-2 rounded-full text-sm font-semibold capitalize ${statusUI.color}`}
                              >
                                <StatusIcon className="w-4 h-4" />

                                {String(
                                  item.status
                                ).replaceAll(
                                  "_",
                                  " "
                                )}
                              </div>

                              {/* TRACKING */}

                              {order.awb_code && (
                                <div className="mt-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
                                  <p className="text-sm text-zinc-400">
                                    AWB:
                                    <span className="text-white font-semibold ml-2">
                                      {
                                        order.awb_code
                                      }
                                    </span>
                                  </p>

                                  <p className="text-sm text-zinc-400">
                                    Courier:
                                    <span className="text-white font-semibold ml-2">
                                      {order.courier_name ||
                                        "Shiprocket"}
                                    </span>
                                  </p>

                                  {order.tracking_url && (
                                    <a
                                      href={
                                        order.tracking_url
                                      }
                                      target="_blank"
                                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-2"
                                    >
                                      <ExternalLink className="w-4 h-4" />

                                      Track
                                      Shipment
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* EARNINGS */}

                            <div className="text-left lg:text-right">
                              <p className="text-zinc-500 text-xs">
                                Earnings
                              </p>

                              <p className="text-white font-bold text-2xl">
                                ₹
                                {Number(
                                  item.seller_earning ||
                                    0
                                )}
                              </p>
                            </div>
                          </div>

                          {/* ACTIONS */}

                          {item.status ===
                            "placed" && (
                            <div className="flex flex-wrap gap-3 mt-6">
                              {/* ACCEPT */}

                              <form
                                action={async () => {
                                  "use server";

                                  await acceptOrder(
                                    order.id
                                  );
                                }}
                              >
                                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-semibold transition active:scale-95">
                                  Accept
                                  Order
                                </button>
                              </form>

                              {/* REJECT */}

                              <form
                                action={async () => {
                                  "use server";

                                  await updateOrderStatus(
                                    item.id,
                                    "cancelled"
                                  );
                                }}
                              >
                                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-semibold transition active:scale-95">
                                  Reject
                                  Order
                                </button>
                              </form>
                            </div>
                          )}

                          {/* PROCESSING */}

                          {(item.status ===
                            "processing" ||
                            item.status ===
                              "accepted") && (
                            <div className="mt-6 flex flex-wrap gap-3">
                              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-5 py-3 rounded-2xl inline-flex items-center gap-3 font-semibold">
                                <Package className="w-5 h-5" />

                                Shipment
                                Created
                              </div>

                              <div className="bg-zinc-800/80 border border-zinc-700 text-zinc-300 px-5 py-3 rounded-2xl inline-flex items-center gap-3 font-medium">
                                Invoice
                                Generated &
                                Ready For
                                Pickup
                              </div>

                              {item.order_id && (
                                <a
                                  href={`/dashboard/seller/invoices/${item.order_id}`}
                                  target="_blank"
                                  className="bg-white text-black hover:bg-zinc-200 px-5 py-3 rounded-2xl inline-flex items-center gap-2 font-semibold transition"
                                >
                                  <Printer className="w-5 h-5" />

                                  Download
                                  Invoice
                                </a>
                              )}
                            </div>
                          )}

                          {/* SHIPPED */}

                          {item.status ===
                            "shipped" && (
                            <div className="mt-6 flex flex-wrap gap-3">
                              <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-5 py-3 rounded-2xl inline-flex items-center gap-3 font-semibold">
                                <Truck className="w-5 h-5" />

                                Shipment
                                Picked Up
                              </div>

                              <div className="bg-zinc-800/80 border border-zinc-700 text-zinc-300 px-5 py-3 rounded-2xl inline-flex items-center gap-3 font-medium">
                                Order is
                                currently in
                                transit
                              </div>
                            </div>
                          )}

                          {/* OFD */}

                          {item.status ===
                            "out_for_delivery" && (
                            <div className="mt-6 flex flex-wrap gap-3">
                              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-5 py-3 rounded-2xl inline-flex items-center gap-3 font-semibold">
                                <Truck className="w-5 h-5" />

                                Out For
                                Delivery
                              </div>
                            </div>
                          )}

                          {/* DELIVERED */}

                          {item.status ===
                            "delivered" && (
                            <div className="mt-6 bg-green-500/10 border border-green-500/20 text-green-400 px-5 py-4 rounded-2xl inline-flex items-center gap-3 font-semibold">
                              <CheckCircle2 className="w-5 h-5" />

                              Delivered
                              Successfully
                            </div>
                          )}

                          {/* CANCELLED */}

                          {item.status ===
                            "cancelled" && (
                            <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl inline-flex items-center gap-3 font-semibold">
                              <XCircle className="w-5 h-5" />

                              Order
                              Cancelled
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}