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
  IndianRupee,
  XCircle,
} from "lucide-react";

type OrderStatus =
  | "pending_payment"
  | "placed"
  | "accepted"
  | "processing"
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
            color,
            is_primary
          )
        ),
        product_variants (
          id,
          color,
          size,
          attributes
        )
      `)
      .eq(
        "order_id",
        order.id
      );

  /* ============================= */
  /* 🔁 RETURNS */
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
  /* 🚚 STATUS */
  /* ============================= */

  const statusMap: Record<
    string,
    number
  > = {
    pending_payment: 0,
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
  /* 🎨 STATUS COLOR */
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

      case "pending_payment":
        return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";

      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  /* ============================= */
  /* 💰 TOTALS */
  /* ============================= */

  const orderTotal =
    Number(
      order.total_amount ||
        0
    );

  const gstTotal =
    Number(
      order.gst_amount ||
        0
    );

  const subtotal =
    orderTotal - gstTotal;

  /* ============================= */
  /* 🎨 IMAGE HELPER */
  /* ============================= */

  const getVariantImage = (
    item: any
  ) => {
    const variantColor =
      item.product_variants
        ?.color ||
      item.product_variants
        ?.attributes
        ?.color;

    const images =
      item.products
        ?.product_images || [];

    /* ============================= */
    /* 🎨 MATCH COLOR */
    /* ============================= */

    if (
      variantColor
    ) {
      const colorImage =
        images.find(
          (img: any) => {
            if (
              !img?.color
            ) {
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

      if (
        colorImage?.url
      ) {
        return colorImage.url;
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

    if (
      primary?.url
    ) {
      return primary.url;
    }

    /* ============================= */
    /* 📦 FIRST */
    /* ============================= */

    if (
      images?.[0]?.url
    ) {
      return images[0].url;
    }

    return "/placeholder.png";
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

                  {order.order_code}

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

                {order.payment_method}

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

          <div className="text-left xl:text-right space-y-2">

            <div>

              <p className="text-zinc-500 text-sm">
                Product Total
              </p>

              <p className="text-xl font-bold text-zinc-900 dark:text-white">

                ₹
                {subtotal.toLocaleString(
                  "en-IN"
                )}

              </p>

            </div>

            <div>

              <p className="text-zinc-500 text-sm">
                GST & Taxes
              </p>

              <p className="text-lg font-semibold text-zinc-900 dark:text-white">

                ₹
                {gstTotal.toLocaleString(
                  "en-IN"
                )}

              </p>

            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">

              <p className="text-zinc-500 text-sm">
                Order Total
              </p>

              <h2 className="text-5xl font-black text-zinc-900 dark:text-white mt-2">

                ₹
                {orderTotal.toLocaleString(
                  "en-IN"
                )}

              </h2>

            </div>
          </div>
        </div>
      </div>

      {/* ================= ITEMS ================= */}

      <div className="space-y-6">

        {items?.map(
          (item: any) => {

            const image =
              getVariantImage(
                item
              );

            const returnData =
              returnMap[
                item.id
              ];

            const itemPrice =
              Number(
                item.final_price || 0
              );

            const itemGst =
              Number(
                item.gst_amount || 0
              );

            const finalItemTotal =
              itemPrice + itemGst;

            const variantColor =
              item.product_variants
                ?.color ||
              item.product_variants
                ?.attributes
                ?.color;

            const variantSize =
              item.product_variants
                ?.size ||
              item.product_variants
                ?.attributes
                ?.size;

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

                    {/* VARIANTS */}

                    <div className="flex gap-3 mt-3 flex-wrap">

                      {variantColor && (

                        <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-medium">

                          Color:
                          {" "}
                          {variantColor}

                        </div>
                      )}

                      {variantSize && (

                        <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-medium">

                          Size:
                          {" "}
                          {variantSize}

                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-5 mt-4 text-zinc-500 text-sm">

                      <p>

                        Qty:
                        {" "}
                        {item.quantity}

                      </p>

                      <p className="capitalize">

                        Status:
                        {" "}
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

                    <div className="mt-5">

                      <div className="flex items-center gap-2">

                        <IndianRupee className="w-6 h-6 text-green-500" />

                        <p className="text-3xl font-black text-zinc-900 dark:text-white">

                          {finalItemTotal.toLocaleString(
                            "en-IN"
                          )}

                        </p>

                      </div>

                      <p className="text-sm text-zinc-500 mt-1">

                        Product ₹
                        {itemPrice}
                        {" "}
                        + GST ₹
                        {itemGst}

                      </p>

                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-col gap-3 xl:w-[220px]">

                    <Link
                      href={`/product/${item.products?.slug}`}
                      className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition text-zinc-900 dark:text-white px-5 py-3 rounded-2xl text-center font-semibold"
                    >
                      View Product
                    </Link>

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