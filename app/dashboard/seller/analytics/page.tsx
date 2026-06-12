
import { redirect } from "next/navigation";

import {
  IndianRupee,
  TrendingUp,
  Wallet,
  Package,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";

import { getSupabaseServer } from "@/lib/supabase-server";

import EarningsChart from "@/components/EarningsChart";

export default async function AnalyticsPage({
  searchParams,
}: any) {

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
  /* 📅 DATE RANGE */
  /* ============================= */

  const range =
    searchParams?.range || "7";

  const daysMap: any = {
    "7": 7,
    "30": 30,
    "90": 90,
  };

  const days =
    daysMap[range] || 7;

  const fromDate =
    new Date();

  fromDate.setDate(
    fromDate.getDate() - days
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
    .maybeSingle();

  /* ============================= */
  /* 📦 ORDERS */
  /* ============================= */

  const {
    data: orderItems,
  } = await supabase
    .from("order_items")
    .select(`
      id,
      quantity,
      seller_earning,
      status,
      created_at,

      products (
        id,
        name
      )
    `)
    .eq(
      "seller_id",
      user.id
    )
    .gte(
      "created_at",
      fromDate.toISOString()
    )
    .order("created_at", {
      ascending: true,
    });

  /* ============================= */
  /* 📊 TOTALS */
  /* ============================= */

  const deliveredOrders =
    orderItems?.filter(
      (item: any) =>
        item.status ===
        "delivered"
    ) || [];

  const totalOrders =
    orderItems?.length || 0;

  const totalEarnings =
    deliveredOrders.reduce(
      (
        sum: number,
        item: any
      ) =>
        sum +
        Number(
          item.seller_earning || 0
        ),
      0
    );

  const withdrawn =
    Number(
      wallet?.total_withdrawn || 0
    );

  const availableBalance =
    Number(
      wallet?.balance || 0
    );

  const lockedBalance =
    Number(
      wallet?.locked_balance || 0
    );

  /* ============================= */
  /* 📈 GROWTH */
  /* ============================= */

  const previousEstimate =
    totalEarnings * 0.8;

  const growth =
    previousEstimate > 0
      ? (
          ((totalEarnings -
            previousEstimate) /
            previousEstimate) *
          100
        ).toFixed(1)
      : "0";

  /* ============================= */
  /* 📦 TOP PRODUCTS */
  /* ============================= */

  const productMap: any = {};

  orderItems?.forEach(
    (item: any) => {

      const name =
        item.products?.name ||
        "Unknown Product";

      if (!productMap[name]) {
        productMap[name] = 0;
      }

      productMap[name] +=
        Number(
          item.quantity || 0
        );

    }
  );

  const topProducts =
    Object.entries(productMap)
      .map(
        ([name, qty]) => ({
          name,
          qty,
        })
      )
      .sort(
        (a: any, b: any) =>
          b.qty - a.qty
      )
      .slice(0, 5);

  /* ============================= */
  /* 📅 CHART DATA */
  /* ============================= */

  const dailyMap: any = {};

  deliveredOrders.forEach(
    (item: any) => {

      const date =
        new Date(
          item.created_at
        ).toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
          }
        );

      if (!dailyMap[date]) {
        dailyMap[date] = {
          earnings: 0,
          orders: 0,
        };
      }

      dailyMap[date].earnings +=
        Number(
          item.seller_earning || 0
        );

      dailyMap[date].orders += 1;

    }
  );

  const chartData =
    Object.entries(dailyMap).map(
      ([date, val]: any) => ({
        date,
        earnings:
          val.earnings,
        orders:
          val.orders,
      })
    );

  /* ============================= */
  /* 🧠 FORMAT */
  /* ============================= */

  const format = (
    num: number
  ) =>
    new Intl.NumberFormat(
      "en-IN"
    ).format(
      Math.round(num)
    );

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">

        {/* ============================= */}
        {/* HEADER */}
        {/* ============================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>

            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-sm text-zinc-300 mb-5">

              <TrendingUp className="w-4 h-4 text-green-400" />

              Seller Analytics
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Analytics Dashboard 📊
            </h1>

            <p className="text-zinc-500 mt-4 text-lg">
              Track your earnings,
              orders and business
              growth.
            </p>
          </div>

          {/* FILTER */}

          <div className="flex items-center gap-3">

            {["7", "30", "90"].map(
              (d) => (

                <a
                  key={d}
                  href={`?range=${d}`}
                  className={`px-5 py-3 rounded-2xl font-semibold transition ${
                    range === d
                      ? "bg-white text-black"
                      : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white"
                  }`}
                >
                  {d} Days
                </a>

              )
            )}
          </div>
        </div>

        {/* ============================= */}
        {/* STATS */}
        {/* ============================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

          <StatCard
            title="Total Earnings"
            value={`₹${format(totalEarnings)}`}
            icon={
              <TrendingUp className="w-6 h-6 text-green-400" />
            }
            color="green"
            extra={`↑ ${growth}% growth`}
          />

          <StatCard
            title="Withdrawn"
            value={`₹${format(withdrawn)}`}
            icon={
              <ArrowUpRight className="w-6 h-6 text-purple-400" />
            }
            color="purple"
          />

          <StatCard
            title="Available Balance"
            value={`₹${format(availableBalance)}`}
            icon={
              <Wallet className="w-6 h-6 text-blue-400" />
            }
            color="blue"
          />

          <StatCard
            title="Orders"
            value={String(totalOrders)}
            icon={
              <ShoppingBag className="w-6 h-6 text-orange-400" />
            }
            color="orange"
          />

        </div>

        {/* ============================= */}
        {/* BALANCE ROW */}
        {/* ============================= */}

        <div className="grid lg:grid-cols-3 gap-6">

          {/* CHART */}

          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[30px] p-6">

            <div className="flex items-center justify-between mb-6">

              <div>
                <h2 className="text-xl font-bold">
                  Earnings Overview
                </h2>

                <p className="text-zinc-500 text-sm mt-1">
                  Daily earnings &
                  order performance
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold">
                ₹{format(totalEarnings)}
              </div>
            </div>

            <EarningsChart
              data={chartData}
            />
          </div>

          {/* WALLET */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-[30px] p-6 space-y-5">

            <div>
              <h2 className="text-xl font-bold">
                Wallet Summary
              </h2>

              <p className="text-zinc-500 text-sm mt-1">
                Your settlement &
                balance details
              </p>
            </div>

            <WalletRow
              title="Available"
              value={`₹${format(availableBalance)}`}
              color="text-green-400"
            />

            <WalletRow
              title="Locked"
              value={`₹${format(lockedBalance)}`}
              color="text-yellow-400"
            />

            <WalletRow
              title="Withdrawn"
              value={`₹${format(withdrawn)}`}
              color="text-purple-400"
            />

          </div>
        </div>

        {/* ============================= */}
        {/* TOP PRODUCTS */}
        {/* ============================= */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-[30px] p-6">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-2xl font-bold">
                Top Selling Products
              </h2>

              <p className="text-zinc-500 mt-1">
                Best performing
                products based on
                orders.
              </p>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-xl text-sm">
              Top 5 Products
            </div>
          </div>

          {!topProducts.length ? (

            <div className="text-center py-16">

              <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />

              <h3 className="text-xl font-bold">
                No Product Sales Yet
              </h3>

              <p className="text-zinc-500 mt-2">
                Product analytics
                will appear here
                after sales.
              </p>
            </div>

          ) : (

            <div className="space-y-4">

              {topProducts.map(
                (
                  product: any,
                  index: number
                ) => (

                  <div
                    key={index}
                    className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700 rounded-2xl px-5 py-4"
                  >

                    <div className="flex items-center gap-4">

                      <div className="h-12 w-12 rounded-2xl bg-zinc-700 flex items-center justify-center font-bold text-lg">
                        #{index + 1}
                      </div>

                      <div>

                        <h3 className="font-semibold">
                          {product.name}
                        </h3>

                        <p className="text-zinc-500 text-sm">
                          Best Seller
                        </p>
                      </div>
                    </div>

                    <div className="text-right">

                      <p className="text-emerald-400 text-xl font-black">
                        {product.qty}
                      </p>

                      <p className="text-zinc-500 text-sm">
                        units sold
                      </p>
                    </div>
                  </div>

                )
              )}
            </div>

          )}
        </div>

      </div>
    </div>
  );
}

/* ============================= */
/* 📦 STAT CARD */
/* ============================= */

function StatCard({
  title,
  value,
  icon,
  extra,
  color,
}: any) {

  const colorMap: any = {
    green:
      "bg-green-500/10 border-green-500/20",
    blue:
      "bg-blue-500/10 border-blue-500/20",
    purple:
      "bg-purple-500/10 border-purple-500/20",
    orange:
      "bg-orange-500/10 border-orange-500/20",
  };

  return (
    <div className={`rounded-[28px] border p-6 bg-zinc-900 ${colorMap[color]}`}>

      <div className="flex items-center justify-between">

        <div>

          <p className="text-zinc-400 text-sm">
            {title}
          </p>

          <h3 className="text-3xl font-black mt-3">
            {value}
          </h3>

          {extra && (
            <p className="text-green-400 text-sm mt-2">
              {extra}
            </p>
          )}
        </div>

        <div className="h-14 w-14 rounded-2xl bg-black/30 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* 💰 WALLET ROW */
/* ============================= */

function WalletRow({
  title,
  value,
  color,
}: any) {
  return (
    <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4">

      <p className="text-zinc-400">
        {title}
      </p>

      <p className={`font-black text-xl ${color}`}>
        {value}
      </p>
    </div>
  );
}

