import Link from "next/link";

import {
  Store,
  Package,
  IndianRupee,
  Wallet,
  Phone,
  Mail,
  Eye,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminSellersPage() {

  /* ============================= */
  /* FETCH SELLERS */
  /* ============================= */

  const { data: sellers, error } =
    await supabaseAdmin
      .from("users")
      .select(`
        *,
        products (
          id,
          name
        ),
        bank_accounts (
          id,
          is_verified
        )
      `)
      .eq("role", "seller")
      .order("created_at", {
        ascending: false,
      });

  /* ============================= */
  /* FETCH ORDERS */
  /* ============================= */

  const { data: allOrders } =
    await supabaseAdmin
      .from("orders")
      .select(`
        id,
        seller_id,
        total_amount,
        status
      `);

  /* ============================= */
  /* FETCH WALLETS */
  /* ============================= */

  const { data: allWallets } =
    await supabaseAdmin
      .from("wallets")
      .select(`
        id,
        seller_id,
        balance,
        locked_balance
      `);

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Failed to load sellers
      </div>
    );
  }

  /* ============================= */
  /* STATS */
  /* ============================= */

  const totalSellers =
    sellers?.length || 0;

  const verifiedSellers =
    sellers?.filter(
      (s) =>
        s.bank_accounts?.[0]?.is_verified
    ).length || 0;

  const totalProducts =
    sellers?.reduce(
      (sum, seller) =>
        sum +
        (seller.products?.length || 0),
      0
    ) || 0;

  const totalRevenue =
    allOrders?.reduce(
      (sum, order) =>
        sum +
        Number(order.total_amount || 0),
      0
    ) || 0;

  return (
    <div className="p-6">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">
          Sellers
        </h1>

        <p className="text-gray-500 mt-1">
          Manage all marketplace sellers
        </p>

      </div>

      {/* ============================= */}
      {/* STATS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        {/* TOTAL SELLERS */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Total Sellers
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalSellers}
              </h2>

            </div>

            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Store className="w-6 h-6 text-blue-600" />
            </div>

          </div>

        </div>

        {/* REVENUE */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Revenue
              </p>

              <h2 className="text-3xl font-bold mt-2">
                ₹{Math.round(totalRevenue)}
              </h2>

            </div>

            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>

          </div>

        </div>

        {/* PRODUCTS */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Total Products
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalProducts}
              </h2>

            </div>

            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>

          </div>

        </div>

        {/* VERIFIED */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Verified Sellers
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {verifiedSellers}
              </h2>

            </div>

            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <BadgeCheck className="w-6 h-6 text-purple-600" />
            </div>

          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* TABLE */}
      {/* ============================= */}

      <div className="bg-white border rounded-2xl overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50 border-b">

              <tr className="text-left">

                <th className="p-4 font-semibold">
                  Seller
                </th>

                <th className="p-4 font-semibold">
                  Contact
                </th>

                <th className="p-4 font-semibold">
                  Products
                </th>

                <th className="p-4 font-semibold">
                  Orders
                </th>

                <th className="p-4 font-semibold">
                  Wallet
                </th>

                <th className="p-4 font-semibold">
                  Verification
                </th>

                <th className="p-4 font-semibold">
                  Joined
                </th>

                <th className="p-4 font-semibold text-center">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {sellers?.map((seller) => {

                /* ============================= */
                /* PRODUCTS */
                /* ============================= */

                const totalProducts =
                  seller.products?.length || 0;

                /* ============================= */
                /* ORDERS */
                /* ============================= */

                const sellerOrders =
                  allOrders?.filter(
                    (o) =>
                      o.seller_id === seller.id
                  ) || [];

                const totalOrders =
                  sellerOrders.length;

                const totalEarnings =
                  sellerOrders.reduce(
                    (sum: number, order: any) =>
                      sum +
                      Number(
                        order.total_amount || 0
                      ),
                    0
                  );

                /* ============================= */
                /* WALLET */
                /* ============================= */

                const wallet =
                  allWallets?.find(
                    (w) =>
                      w.seller_id === seller.id
                  );

                /* ============================= */
                /* VERIFICATION */
                /* ============================= */

                const isVerified =
                  seller.bank_accounts?.[0]
                    ?.is_verified;

                return (
                  <tr
                    key={seller.id}
                    className="border-b hover:bg-gray-50 transition"
                  >

                    {/* SELLER */}

                    <td className="p-4">

                      <div>

                        <h3 className="font-semibold">
                          {seller.name || "Unnamed"}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {totalProducts} products
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          ₹{Math.round(totalEarnings)} revenue
                        </p>

                      </div>

                    </td>

                    {/* CONTACT */}

                    <td className="p-4">

                      <div className="space-y-1">

                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {seller.email}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {seller.phone || "N/A"}
                        </div>

                      </div>

                    </td>

                    {/* PRODUCTS */}

                    <td className="p-4">

                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-500" />

                        <span className="font-medium">
                          {totalProducts}
                        </span>
                      </div>

                    </td>

                    {/* ORDERS */}

                    <td className="p-4">

                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-500" />

                        <span className="font-medium">
                          {totalOrders}
                        </span>
                      </div>

                    </td>

                    {/* WALLET */}

                    <td className="p-4">

                      <div className="flex items-center gap-2">

                        <Wallet className="w-4 h-4 text-green-500" />

                        <span className="font-semibold">
                          ₹
                          {Math.round(
                            Number(
                              wallet?.balance || 0
                            )
                          )}
                        </span>

                      </div>

                    </td>

                    {/* VERIFIED */}

                    <td className="p-4">

                      {isVerified ? (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1 w-fit">

                          <ShieldCheck className="w-3 h-3" />

                          Verified

                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                          Pending
                        </span>
                      )}

                    </td>

                    {/* JOINED */}

                    <td className="p-4">

                      <div className="flex items-center gap-2 text-sm text-gray-600">

                        <CalendarDays className="w-4 h-4" />

                        {new Date(
                          seller.created_at
                        ).toLocaleDateString()}

                      </div>

                    </td>

                    {/* ACTIONS */}

                    <td className="p-4">

                      <div className="flex justify-center">

                        <Link
                          href={`/dashboard/admin/sellers/${seller.id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 text-sm"
                        >

                          <Eye className="w-4 h-4" />

                          View

                        </Link>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}