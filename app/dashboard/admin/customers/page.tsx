import Link from "next/link";

import {
  Users,
  ShoppingBag,
  RotateCcw,
  ShieldAlert,
  Phone,
  Mail,
  Eye,
  CalendarDays,
  IndianRupee,
} from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminCustomersPage() {

  /* ============================= */
  /* FETCH CUSTOMERS */
  /* ============================= */

const { data: customers, error } =
  await supabaseAdmin
    .from("users")
    .select(`
      *,
      orders (
        id,
        total_amount,
        status
      ),
      returns!returns_customer_id_fkey (
        id,
        status
      ),
      addresses (
        id,
        city,
        state
      )
    `)
    .eq("role", "customer")
    .order("created_at", {
      ascending: false,
    });
  if (error) {
    return (
      <div className="p-6 text-red-500">
        Failed to load customers
      </div>
    );
  }

  /* ============================= */
  /* STATS */
  /* ============================= */

  const totalCustomers =
    customers?.length || 0;

  const codBlocked =
    customers?.filter(
      (c) => c.is_cod_blocked
    ).length || 0;

  const riskyCustomers =
    customers?.filter(
      (c) => (c.rto_count || 0) >= 3
    ).length || 0;

  const totalRevenue =
    customers?.reduce((sum, customer) => {
      const spent =
        customer.orders?.reduce(
          (orderSum: number, order: any) =>
            orderSum +
            Number(order.total_amount || 0),
          0
        ) || 0;

      return sum + spent;
    }, 0) || 0;

  return (
    <div className="p-6">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Customers
        </h1>

        <p className="text-gray-500 mt-1">
          Manage all marketplace customers
        </p>
      </div>

      {/* ============================= */}
      {/* STATS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Customers
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalCustomers}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>

          </div>
        </div>

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

        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                COD Blocked
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {codBlocked}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>

          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Risky Customers
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {riskyCustomers}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-orange-600" />
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
                  Customer
                </th>

                <th className="p-4 font-semibold">
                  Contact
                </th>

                <th className="p-4 font-semibold">
                  Orders
                </th>

                <th className="p-4 font-semibold">
                  Returns
                </th>

                <th className="p-4 font-semibold">
                  RTO
                </th>

                <th className="p-4 font-semibold">
                  COD Status
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

              {customers?.map((customer) => {

                const totalOrders =
                  customer.orders?.length || 0;

                const totalReturns =
                  customer.returns?.length || 0;

                const totalSpent =
                  customer.orders?.reduce(
                    (sum: number, order: any) =>
                      sum +
                      Number(order.total_amount || 0),
                    0
                  ) || 0;

                const address =
                  customer.addresses?.[0];

                return (
                  <tr
                    key={customer.id}
                    className="border-b hover:bg-gray-50 transition"
                  >

                    {/* CUSTOMER */}
                    <td className="p-4">

                      <div>

                        <h3 className="font-semibold">
                          {customer.name || "Unnamed"}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {address
                            ? `${address.city}, ${address.state}`
                            : "No address"}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          ₹{Math.round(totalSpent)} spent
                        </p>

                      </div>

                    </td>

                    {/* CONTACT */}
                    <td className="p-4">

                      <div className="space-y-1">

                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {customer.email}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {customer.phone || "N/A"}
                        </div>

                      </div>

                    </td>

                    {/* ORDERS */}
                    <td className="p-4">

                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-blue-500" />

                        <span className="font-medium">
                          {totalOrders}
                        </span>
                      </div>

                    </td>

                    {/* RETURNS */}
                    <td className="p-4">

                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-orange-500" />

                        <span className="font-medium">
                          {totalReturns}
                        </span>
                      </div>

                    </td>

                    {/* RTO */}
                    <td className="p-4">

                      <span
                        className={`font-semibold ${
                          customer.rto_count >= 3
                            ? "text-red-600"
                            : "text-gray-700"
                        }`}
                      >
                        {customer.rto_count || 0}
                      </span>

                    </td>

                    {/* COD */}
                    <td className="p-4">

                      {customer.is_cod_blocked ? (
                        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          Blocked
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          Active
                        </span>
                      )}

                    </td>

                    {/* JOINED */}
                    <td className="p-4">

                      <div className="flex items-center gap-2 text-sm text-gray-600">

                        <CalendarDays className="w-4 h-4" />

                        {new Date(
                          customer.created_at
                        ).toLocaleDateString()}

                      </div>

                    </td>

                    {/* ACTIONS */}
                    <td className="p-4">

                      <div className="flex justify-center">

                        <Link
                          href={`/dashboard/admin/customers/${customer.id}`}
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