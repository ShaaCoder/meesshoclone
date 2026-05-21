// app/dashboard/user/page.tsx

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import { redirect } from "next/navigation";

import Link from "next/link";

import { format } from "date-fns";

import {
  Package,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";

export default async function UserDashboard() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  /* ============================= */
  /* 📦 FETCH ORDERS */
  /* ============================= */

  const { data: orders, error } =
    await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_code,
        status,
        payment_method,
        payment_status,
        total_amount,
        created_at,

        order_items (
          id,
          quantity,
          final_price
        )
      `)
      .eq("customer_id", user.id)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(error);
  }

  /* ============================= */
  /* 🎨 STATUS ICON */
  /* ============================= */

  const getStatusIcon = (
    status: string
  ) => {
    switch (status?.toLowerCase()) {
      case "placed":
      case "processing":
        return (
          <Clock className="w-4 h-4" />
        );

      case "shipped":
      case "out_for_delivery":
        return (
          <Truck className="w-4 h-4" />
        );

      case "delivered":
        return (
          <CheckCircle2 className="w-4 h-4" />
        );

      case "cancelled":
        return (
          <XCircle className="w-4 h-4" />
        );

      case "returned":
      case "rto":
        return (
          <RotateCcw className="w-4 h-4" />
        );

      default:
        return (
          <AlertCircle className="w-4 h-4" />
        );
    }
  };

  /* ============================= */
  /* 🎨 STATUS COLORS */
  /* ============================= */

  const getStatusColor = (
    status: string
  ) => {
    switch (status?.toLowerCase()) {
      case "placed":
      case "processing":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";

      case "shipped":
      case "out_for_delivery":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";

      case "delivered":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";

      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";

      case "returned":
      case "rto":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400";

      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}

      <div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
          <Package className="w-9 h-9" />

          My Orders
        </h1>

        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Track and manage all your orders in one place
        </p>
      </div>

      {/* ================= EMPTY ================= */}

      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">

          <Package className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-5" />

          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
            No orders yet
          </h3>

          <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
            Once you place your first order,
            it will appear here.
          </p>

          <Link
            href="/shop"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium hover:scale-105 transition"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">

          {orders.map((order: any) => {
            const totalItems =
              order.order_items?.reduce(
                (
                  acc: number,
                  item: any
                ) =>
                  acc +
                  Number(
                    item.quantity || 0
                  ),
                0
              ) || 0;

            return (
              <Link
                key={order.id}

              
                href={`/dashboard/user/orders/${order.order_code}`}

                className="group block"
              >
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                    {/* ================= LEFT ================= */}

                    <div className="flex items-center gap-4">

                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Package className="w-7 h-7 text-zinc-600 dark:text-zinc-400" />
                      </div>

                      <div>
                        <p className="font-mono text-xs tracking-widest text-zinc-500 dark:text-zinc-400">
                          {order.order_code}
                        </p>

                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">
                          {totalItems} item
                          {totalItems > 1
                            ? "s"
                            : ""}
                        </h2>

                        <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">

                          <Calendar className="w-4 h-4" />

                          {format(
                            new Date(
                              order.created_at
                            ),
                            "dd MMM yyyy"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ================= RIGHT ================= */}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                      {/* PRICE */}

                      <div className="flex items-center gap-1 text-2xl font-bold text-zinc-900 dark:text-white">

                        <IndianRupee className="w-5 h-5" />

                        {Number(
                          order.total_amount || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </div>

                      {/* STATUS */}

                      <div
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-medium capitalize ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(
                          order.status
                        )}

                        {String(
                          order.status || ""
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ================= FOOTER ================= */}

                  <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">

                    <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">

                      <p>
                        Payment:{" "}

                        <span className="font-medium capitalize">
                          {
                            order.payment_method
                          }
                        </span>
                      </p>

                      <p>
                        Status:{" "}

                        <span className="font-medium capitalize">
                          {
                            order.payment_status
                          }
                        </span>
                      </p>
                    </div>

                    <span className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}