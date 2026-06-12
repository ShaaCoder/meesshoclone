import { redirect } from "next/navigation";

import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Wallet,
  RotateCcw,
} from "lucide-react";

import { getSupabaseServer } from "@/lib/supabase-server";

import SellerProductCard from "@/components/dashboard/seller/SellerProductCard";
import Pagination from "@/components/ui/Pagination";

export default async function SellerPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
  }>;
}) {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  /* ============================= */
  /* 📄 PAGINATION */
  /* ============================= */

  const params =
    await searchParams;

  const currentPage =
    Number(
      params?.page || 1
    );

  const itemsPerPage = 9;

 const {
  data: products,
  count,
  error,
} = await supabase
  .from("products")
  .select(
    `
    id,
    name,
    slug,
    status,
    approval_status,
    seller_id,
    created_at,

    categories (
      id,
      name
    ),

    product_images (
      id,
      url,
      is_primary
    ),

    product_variants (
      id,
      stock,
      mrp,
      cost_price,
      selling_price,
      seller_profit,
      platform_margin
    )
    `,
    {
      count: "exact",
    }
  )
  .eq("seller_id", user.id)
  .neq("status", "deleted")
  .order("created_at", {
    ascending: false,
  })
  .range(
    (currentPage - 1) *
      itemsPerPage,
    currentPage *
      itemsPerPage -
      1
  );

  /* ============================= */
  /* 💰 WALLET */
  /* ============================= */

  const {
    data: wallet,
  } = await supabase
    .from("wallets")
    .select(`
      balance,
      locked_balance,
      total_earnings,
      total_withdrawn
    `)
    .eq(
      "seller_id",
      user.id
    )
    .single();

  /* ============================= */
  /* 📦 ORDER ITEMS */
  /* ============================= */

  const {
    data: orderItems,
  } = await supabase
    .from("order_items")
    .select(`
      id,
      status,
      seller_earning
    `)
    .eq(
      "seller_id",
      user.id
    );

  /* ============================= */
  /* 🔁 RETURNS */
  /* ============================= */

  const {
    data: returns,
  } = await supabase
    .from("returns")
    .select(`
      id,
      status
    `)
    .eq(
      "seller_id",
      user.id
    );

  /* ============================= */
  /* 📊 STATS */
  /* ============================= */

  const totalProducts =
    count || 0;

  const totalOrders =
    orderItems?.length ||
    0;

  const deliveredOrders =
    orderItems?.filter(
      (item: any) =>
        item.status ===
        "delivered"
    ).length || 0;

  const processingOrders =
    orderItems?.filter(
      (item: any) =>
        item.status ===
          "processing" ||
        item.status ===
          "accepted"
    ).length || 0;

  const shippedOrders =
    orderItems?.filter(
      (item: any) =>
        item.status ===
          "shipped" ||
        item.status ===
          "out_for_delivery"
    ).length || 0;

  const cancelledOrders =
    orderItems?.filter(
      (item: any) =>
        item.status ===
        "cancelled"
    ).length || 0;

  const returnOrders =
    returns?.length || 0;

  const conversionRate =
    totalOrders > 0
      ? Math.round(
          (deliveredOrders /
            totalOrders) *
            100
        )
      : 0;

  /* ============================= */
  /* 💰 MONEY */
  /* ============================= */

  const totalEarnings =
    Number(
      wallet?.total_earnings ||
        0
    );

  const availableBalance =
    Number(
      wallet?.balance || 0
    );

  const lockedBalance =
    Number(
      wallet?.locked_balance ||
        0
    );

  const withdrawnAmount =
    Number(
      wallet?.total_withdrawn ||
        0
    );

  /* ============================= */
  /* 📄 PAGINATION */
  /* ============================= */

  const totalPages =
    Math.ceil(
      (count || 0) /
        itemsPerPage
    );

  /* ============================= */
  /* UI */
  /* ============================= */

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-10">

        {/* ============================= */}
        {/* HERO */}
        {/* ============================= */}

        <div className="relative overflow-hidden rounded-[40px] border border-zinc-800 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-8 lg:p-10">

          {/* GLOW */}

          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-blue-500/5 to-purple-500/5" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10">

            {/* LEFT */}

            <div className="max-w-2xl">

              <div className="inline-flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-4 py-2 rounded-full text-sm text-zinc-300 mb-6">
                <TrendingUp className="w-4 h-4 text-green-400" />

                Seller Dashboard
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-none tracking-tight">
                Welcome Back 👋
              </h1>

              <p className="text-zinc-400 text-lg leading-8 mt-5">
                Track orders,
                earnings,
                settlements and
                performance of
                your marketplace
                business.
              </p>

              <div className="flex flex-wrap gap-4 mt-8">

                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-5 py-3 rounded-2xl font-semibold">
                  {
                    deliveredOrders
                  }{" "}
                  Delivered
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-5 py-3 rounded-2xl font-semibold">
                  {
                    conversionRate
                  }
                  % Success Rate
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-5 py-3 rounded-2xl font-semibold">
                  {
                    returnOrders
                  }{" "}
                  Returns
                </div>
              </div>
            </div>

            {/* RIGHT */}

            <div className="grid grid-cols-2 gap-4 w-full xl:w-[560px]">

              {/* TOTAL EARNINGS */}

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-zinc-500 text-sm">
                      Total Earnings
                    </p>

                    <h3 className="text-3xl font-black text-green-400 mt-3">
                      ₹
                      {totalEarnings.toLocaleString()}
                    </h3>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <IndianRupee className="w-7 h-7 text-green-400" />
                  </div>
                </div>
              </div>

              {/* AVAILABLE */}

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-zinc-500 text-sm">
                      Available
                    </p>

                    <h3 className="text-3xl font-black text-white mt-3">
                      ₹
                      {availableBalance.toLocaleString()}
                    </h3>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Wallet className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* LOCKED */}

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-zinc-500 text-sm">
                      Locked Balance
                    </p>

                    <h3 className="text-3xl font-black text-yellow-400 mt-3">
                      ₹
                      {lockedBalance.toLocaleString()}
                    </h3>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Clock3 className="w-7 h-7 text-yellow-400" />
                  </div>
                </div>
              </div>

              {/* WITHDRAWN */}

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-zinc-500 text-sm">
                      Withdrawn
                    </p>

                    <h3 className="text-3xl font-black text-purple-400 mt-3">
                      ₹
                      {withdrawnAmount.toLocaleString()}
                    </h3>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-7 h-7 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================= */}
        {/* ORDER STATS */}
        {/* ============================= */}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-zinc-500 text-sm">
              Products
            </p>

            <h3 className="text-3xl font-black mt-3">
              {
                totalProducts
              }
            </h3>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-zinc-500 text-sm">
              Orders
            </p>

            <h3 className="text-3xl font-black text-white mt-3">
              {totalOrders}
            </h3>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-blue-400 text-sm">
              Processing
            </p>

            <h3 className="text-3xl font-black text-blue-400 mt-3">
              {
                processingOrders
              }
            </h3>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5">
            <p className="text-purple-400 text-sm">
              Shipped
            </p>

            <h3 className="text-3xl font-black text-purple-400 mt-3">
              {
                shippedOrders
              }
            </h3>
          </div>

          <div className="rounded-3xl border border-green-500/20 bg-green-500/5 p-5">
            <p className="text-green-400 text-sm">
              Delivered
            </p>

            <h3 className="text-3xl font-black text-green-400 mt-3">
              {
                deliveredOrders
              }
            </h3>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-red-400 text-sm">
              Cancelled
            </p>

            <h3 className="text-3xl font-black text-red-400 mt-3">
              {
                cancelledOrders
              }
            </h3>
          </div>
        </div>

        {/* ============================= */}
        {/* PRODUCTS HEADER */}
        {/* ============================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

          <div>
            <h2 className="text-3xl font-black">
              Your Products
            </h2>

            <p className="text-zinc-500 mt-2">
              Manage and monitor
              your listed
              products.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3">
              <p className="text-zinc-500 text-sm">
                Showing
              </p>

              <p className="font-bold text-white mt-1">
                {
                  products?.length
                }{" "}
                Products
              </p>
            </div>

            <button className="bg-white text-black hover:bg-zinc-200 transition px-5 py-3 rounded-2xl font-semibold inline-flex items-center gap-2">
              View Analytics

              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================= */}
        {/* PRODUCTS */}
        {/* ============================= */}

        {!products?.length ? (

          <div className="rounded-[32px] border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-20 text-center">

            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-zinc-500" />
            </div>

            <h3 className="text-3xl font-bold mt-8">
              No Products Found
            </h3>

            <p className="text-zinc-500 mt-4 max-w-md mx-auto leading-7">
              Start adding
              products to grow
              your marketplace
              business.
            </p>
          </div>

        ) : (

          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">

              {products.map(
                (
                  product: any
                ) => (
                  <SellerProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                  />
                )
              )}
            </div>

            {totalPages > 1 && (
              <div className="pt-6">
                <Pagination
                  currentPage={
                    currentPage
                  }
                  totalPages={
                    totalPages
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}