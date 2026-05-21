import Link from "next/link";

import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  CheckCircle,
  Truck,
  Package,
  Clock,
  RotateCcw,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  IndianRupee,
  MapPin,
  XCircle,
} from "lucide-react";

type OrderStatus =
  | "placed"
  | "accepted"
  | "accepted"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export default async function OrderDetails({
  params,
}: {
  params: Promise<{
    orderCode: string;
  }>;
}) {
  const { orderCode } =
    await params;

  /* ============================= */
  /* 📦 FETCH ORDER */
  /* ============================= */

  const {
    data: order,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      addresses (
        name,
        phone,
        address_line,
        city,
        state,
        pincode
      )
    `)
    .eq(
      "order_code",
      orderCode
    )
    .single();

  if (error || !order) {
    return notFound();
  }

  /* ============================= */
  /* 📦 FETCH ITEMS */
  /* ============================= */

  const { data: items } =
    await supabaseAdmin
      .from("order_items")
      .select(`
        *,
        products (
          name,
          slug,
          product_images (
            url,
            is_primary
          )
        )
      `)
      .eq(
        "order_id",
        order.id
      );

  /* ============================= */
  /* 🔁 FETCH RETURNS */
  /* ============================= */

  const { data: returns } =
    await supabaseAdmin
      .from("returns")
      .select("*")
      .eq(
        "order_id",
        order.id
      );

  const returnMap: Record<
    string,
    any
  > = {};

  (returns || []).forEach(
    (r: any) => {
      returnMap[
        r.order_item_id
      ] = r;
    }
  );

  /* ============================= */
  /* 🚚 SHIPMENT */
  /* ============================= */

  const shipment = {
    courier_name:
      order.courier_name,

    awb_code:
      order.awb_code,

    tracking_url:
      order.tracking_url,
  };

  /* ============================= */
  /* 🚚 STATUS STEPS */
  /* ============================= */

  const steps = [
    {
      key: "placed",
      label:
        "Order Placed",
      icon: Clock,
    },

    {
      key: "accepted",
      label:
        "Accepted",
      icon: Package,
    },

    {
      key: "shipped",
      label: "Shipped",
      icon: Truck,
    },

    {
      key:
        "out_for_delivery",
      label:
        "Out For Delivery",
      icon: Truck,
    },

    {
      key: "delivered",
      label:
        "Delivered",
      icon: CheckCircle,
    },
  ];

  const statusMap: Record<
    string,
    number
  > = {
    placed: 0,

    accepted: 1,

    processing: 1,

    shipped: 2,

    out_for_delivery: 3,

    delivered: 4,

    cancelled: 0,
  };

  const currentStep =
    statusMap[
      order.status ||
        "placed"
    ] ?? 0;

  /* ============================= */
  /* 🔁 RETURN */
  /* ============================= */

  const canReturn = (
    item: any
  ) => {
    const delivered =
      order.status ===
        "delivered" ||
      item.status ===
        "delivered";

    if (!delivered) {
      return false;
    }

    if (
      returnMap[item.id]
    ) {
      return false;
    }

    if (
      order.return_deadline
    ) {
      return (
        new Date() <
        new Date(
          order.return_deadline
        )
      );
    }

    return true;
  };

  const returnExpired =
    order.return_deadline &&
    new Date() >
      new Date(
        order.return_deadline
      );

  /* ============================= */
  /* 🎨 STATUS COLORS */
  /* ============================= */

  const getStatusColor = (
    status: string
  ) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";

      case "shipped":
      case "out_for_delivery":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";

      case "accepted":
      case "processing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";

      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* ================= HEADER ================= */}

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-black dark:text-white" />
              </div>

              <div>
                <h1 className="text-4xl font-black text-zinc-900 dark:text-white">
                  {
                    order.order_code
                  }
                </h1>

                <p className="text-zinc-500 mt-2">
                  Ordered on{" "}
                  {new Date(
                    order.created_at
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* BADGES */}

            <div className="flex flex-wrap gap-3 mt-6">
              <div className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm capitalize text-zinc-900 dark:text-white">
                {
                  order.payment_method
                }
              </div>

              <div
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  order.payment_status ===
                  "paid"
                    ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                {order.payment_status ===
                "paid"
                  ? "Paid"
                  : "Unpaid"}
              </div>

              <div
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${getStatusColor(
                  order.status
                )}`}
              >
                {String(
                  order.status
                ).replaceAll(
                  "_",
                  " "
                )}
              </div>

              {!returnExpired &&
                order.status ===
                  "delivered" && (
                  <div className="px-4 py-2 rounded-xl bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-sm font-semibold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Eligible For Return
                  </div>
                )}

              {returnExpired && (
                <div className="px-4 py-2 rounded-xl bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Return Window Closed
                </div>
              )}

              {order.status ===
                "cancelled" && (
                <div className="px-4 py-2 rounded-xl bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-sm font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Order Cancelled
                </div>
              )}
            </div>
          </div>

          {/* PRICE */}

          <div className="text-left xl:text-right">
            <p className="text-zinc-500 text-sm">
              Order Total
            </p>

            <h2 className="text-5xl font-black text-zinc-900 dark:text-white mt-2">
              ₹
              {Number(
                order.total_amount ||
                  0
              ).toLocaleString(
                "en-IN"
              )}
            </h2>
          </div>
        </div>
      </div>

      {/* ================= SHIPPING + ADDRESS ================= */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* SHIPPING */}

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-6 h-6 text-zinc-900 dark:text-white" />

            <h2 className="font-bold text-xl text-zinc-900 dark:text-white">
              Shipping Details
            </h2>
          </div>

          {shipment?.awb_code ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-zinc-500">
                  Courier
                </p>

                <p className="font-semibold text-zinc-900 dark:text-white">
                  {shipment.courier_name ||
                    "Shiprocket"}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">
                  AWB Code
                </p>

                <p className="font-semibold text-zinc-900 dark:text-white">
                  {
                    shipment.awb_code
                  }
                </p>
              </div>

              {shipment.tracking_url && (
                <a
                  href={
                    shipment.tracking_url
                  }
                  target="_blank"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-2xl font-semibold"
                >
                  Track Package

                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">
              Shipment not created
              yet
            </p>
          )}
        </div>

        {/* ADDRESS */}

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-zinc-900 dark:text-white" />

            <h2 className="font-bold text-xl text-zinc-900 dark:text-white">
              Delivery Address
            </h2>
          </div>

          <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
            <p className="font-semibold text-zinc-900 dark:text-white">
              {
                order.addresses
                  ?.name
              }
            </p>

            <p>
              {
                order.addresses
                  ?.phone
              }
            </p>

            <p>
              {
                order.addresses
                  ?.address_line
              }
            </p>

            <p>
              {
                order.addresses
                  ?.city
              }
              ,{" "}
              {
                order.addresses
                  ?.state
              }{" "}
              -{" "}
              {
                order.addresses
                  ?.pincode
              }
            </p>
          </div>
        </div>
      </div>

      {/* ================= STATUS ================= */}

      {order.status !==
        "cancelled" && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow border border-zinc-200 dark:border-zinc-800">
          <h2 className="font-bold text-xl text-zinc-900 dark:text-white mb-10">
            Order Status
          </h2>

          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-6 w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />

            <div
              className="absolute left-0 top-6 h-1 bg-green-500 rounded-full transition-all"
              style={{
                width: `${
                  (currentStep /
                    (steps.length -
                      1)) *
                  100
                }%`,
              }}
            />

            {steps.map(
              (
                step,
                index
              ) => {
                const Icon =
                  step.icon;

                const active =
                  index <=
                  currentStep;

                return (
                  <div
                    key={
                      step.label
                    }
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-4 transition ${
                        active
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-500"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <p
                      className={`mt-4 text-sm font-medium text-center ${
                        active
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-500"
                      }`}
                    >
                      {
                        step.label
                      }
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ================= ITEMS ================= */}

      <div className="space-y-6">
        {items?.map(
          (item: any) => {
            const image =
              item.products?.product_images?.find(
                (
                  i: any
                ) =>
                  i.is_primary
              )?.url ||
              item.products
                ?.product_images?.[0]
                ?.url ||
              "/placeholder.png";

            const returnData =
              returnMap[
                item.id
              ];

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className="p-6 flex flex-col xl:flex-row gap-6">
                  {/* IMAGE */}

                  <img
                    src={image}
                    alt=""
                    className="w-36 h-36 rounded-3xl object-cover border border-zinc-200 dark:border-zinc-800"
                  />

                  {/* INFO */}

                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {item.product_name ||
                        item.products
                          ?.name}
                    </h2>

                    <div className="flex flex-wrap gap-5 mt-4 text-zinc-500 text-sm">
                      <p>
                        Qty:{" "}
                        {
                          item.quantity
                        }
                      </p>

                      <p className="capitalize">
                        Status:{" "}
                        {(
                          item.status ||
                          order.status
                        )?.replaceAll(
                          "_",
                          " "
                        )}
                      </p>
                    </div>

                    {/* PRICE */}

                    <div className="flex items-center gap-2 mt-5">
                      <IndianRupee className="w-6 h-6 text-green-500" />

                      <p className="text-3xl font-black text-zinc-900 dark:text-white">
                        {Number(
                          item.final_price
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </div>

                    {/* RETURN */}

                    {returnData && (
                      <div className="mt-5">
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold ${
                            returnData.status ===
                            "requested"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                              : ""
                          } ${
                            returnData.status ===
                            "approved"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                              : ""
                          } ${
                            returnData.status ===
                            "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : ""
                          }`}
                        >
                          <RotateCcw className="w-4 h-4" />

                          Return{" "}
                          {
                            returnData.status
                          }
                        </div>
                      </div>
                    )}

                    {!returnData &&
                      order.return_deadline && (
                        <div className="mt-5 text-sm text-zinc-500">
                          Return available
                          till{" "}
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {new Date(
                              order.return_deadline
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-col gap-3 xl:w-[220px]">
                    <Link
                      href={`/product/${item.products?.slug}`}
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition text-zinc-900 dark:text-white px-5 py-3 rounded-2xl text-center font-semibold"
                    >
                      View Product
                    </Link>

                    <button className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 transition text-white dark:text-black px-5 py-3 rounded-2xl font-semibold">
                      Buy Again
                    </button>

                    {canReturn(
                      item
                    ) && (
                      <Link
                        href={`/dashboard/user/returns/request?item=${item.id}`}
                        className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-3 rounded-2xl font-semibold text-center flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />

                        Return Item
                      </Link>
                    )}

                    {returnData && (
                      <Link
                        href={`/dashboard/user/returns`}
                        className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-2xl font-semibold text-center"
                      >
                        Track Return
                      </Link>
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