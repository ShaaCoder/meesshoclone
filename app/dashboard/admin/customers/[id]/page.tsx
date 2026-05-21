import Link from "next/link";

import {
  ArrowLeft,
  Mail,
  Phone,
  ShoppingBag,
  RotateCcw,
  ShieldAlert,
  CalendarDays,
  IndianRupee,
  MapPin,
} from "lucide-react";

import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailsPage({
  params,
}: Props) {
  const { id } = await params;

  /* ============================= */
  /* FETCH CUSTOMER */
  /* ============================= */

  const { data: customer, error } =
  await supabaseAdmin
    .from("users")
    .select(`
      *,
      orders!orders_customer_id_fkey (
        id,
        order_code,
        total_amount,
        status,
        payment_status,
        created_at
      ),
      returns!returns_customer_id_fkey (
        id,
        status,
        refund_amount,
        created_at
      ),
      addresses (
        *
      ),
      customer_refund_accounts (
        *
      )
    `)
    .eq("id", id)
    .eq("role", "customer")
    .single();

  /* ============================= */
  /* CALCULATIONS */
  /* ============================= */

  const totalOrders =
    customer.orders?.length || 0;

  const totalReturns =
    customer.returns?.length || 0;

  const totalSpent =
    customer.orders?.reduce(
      (sum: number, order: any) =>
        sum + Number(order.total_amount || 0),
      0
    ) || 0;

  const totalRefund =
    customer.returns?.reduce(
      (sum: number, item: any) =>
        sum + Number(item.refund_amount || 0),
      0
    ) || 0;

  return (
    <div className="p-6">

      {/* ============================= */}
      {/* BACK */}
      {/* ============================= */}

      <Link
        href="/dashboard/admin/customers"
        className="inline-flex items-center gap-2 mb-6 text-sm text-gray-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to customers
      </Link>

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="bg-white border rounded-2xl p-6 mb-8">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>

            <h1 className="text-3xl font-bold">
              {customer.name || "Unnamed Customer"}
            </h1>

            <p className="text-gray-500 mt-1">
              Customer ID: {customer.id}
            </p>

            <div className="flex flex-wrap gap-3 mt-4">

              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                {customer.email}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                {customer.phone || "N/A"}
              </div>

            </div>

          </div>

          <div>

            {customer.is_cod_blocked ? (
              <span className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-semibold text-sm">
                COD Blocked
              </span>
            ) : (
              <span className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-semibold text-sm">
                COD Active
              </span>
            )}

          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* STATS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Orders
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalOrders}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>

          </div>

        </div>

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Spent
              </p>

              <h2 className="text-3xl font-bold mt-2">
                ₹{Math.round(totalSpent)}
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
                Returns
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalReturns}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-orange-600" />
            </div>

          </div>

        </div>

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Refund Amount
              </p>

              <h2 className="text-3xl font-bold mt-2">
                ₹{Math.round(totalRefund)}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>

          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* ADDRESSES */}
      {/* ============================= */}

      <div className="bg-white border rounded-2xl p-6 mb-8">

        <h2 className="text-xl font-bold mb-5">
          Addresses
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {customer.addresses?.length ? (
            customer.addresses.map((address: any) => (
              <div
                key={address.id}
                className="border rounded-xl p-4"
              >

                <div className="flex items-start gap-3">

                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />

                  <div>

                    <h3 className="font-semibold">
                      {address.name}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {address.address_line}
                    </p>

                    <p className="text-sm text-gray-600">
                      {address.city}, {address.state}
                    </p>

                    <p className="text-sm text-gray-600">
                      {address.pincode}
                    </p>

                    <p className="text-sm text-gray-600 mt-2">
                      {address.phone}
                    </p>

                  </div>

                </div>

              </div>
            ))
          ) : (
            <p className="text-gray-500">
              No addresses found
            </p>
          )}

        </div>

      </div>
<div className="bg-white border rounded-2xl p-6 mb-8">

  <h2 className="text-xl font-bold mb-5">
    Refund Accounts
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    {customer.customer_refund_accounts?.length ? (

      customer.customer_refund_accounts.map(
        (account: any) => (

          <div
            key={account.id}
            className="border rounded-xl p-5"
          >

            <div className="space-y-2">

              <h3 className="font-semibold text-lg">
                {account.account_holder_name}
              </h3>

              {account.bank_name && (
                <p className="text-sm text-gray-600">
                  Bank: {account.bank_name}
                </p>
              )}

              {account.account_number && (
                <p className="text-sm text-gray-600">
                  A/C: XXXX
                  {account.account_number.slice(-4)}
                </p>
              )}

              {account.ifsc_code && (
                <p className="text-sm text-gray-600">
                  IFSC: {account.ifsc_code}
                </p>
              )}

              {account.upi_id && (
                <p className="text-sm text-gray-600">
                  UPI: {account.upi_id}
                </p>
              )}

              {account.phone && (
                <p className="text-sm text-gray-600">
                  Phone: {account.phone}
                </p>
              )}

              {account.is_default && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  Default
                </span>
              )}

            </div>

          </div>
        )
      )

    ) : (

      <p className="text-gray-500">
        No refund accounts added
      </p>

    )}

  </div>

</div>
      {/* ============================= */}
      {/* ORDERS */}
      {/* ============================= */}

      <div className="bg-white border rounded-2xl p-6">

        <h2 className="text-xl font-bold mb-5">
          Orders
        </h2>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="border-b bg-gray-50">

              <tr className="text-left">

                <th className="p-4">
                  Order
                </th>

                <th className="p-4">
                  Amount
                </th>

                <th className="p-4">
                  Status
                </th>

                <th className="p-4">
                  Payment
                </th>

                <th className="p-4">
                  Date
                </th>

              </tr>

            </thead>

            <tbody>

              {customer.orders?.length ? (
                customer.orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b"
                  >

                    <td className="p-4 font-medium">
                      {order.order_code || order.id.slice(0, 8)}
                    </td>

                    <td className="p-4">
                      ₹{order.total_amount}
                    </td>

                    <td className="p-4">

                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold capitalize">
                        {order.status}
                      </span>

                    </td>

                    <td className="p-4">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.payment_status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.payment_status}
                      </span>

                    </td>

                    <td className="p-4 text-sm text-gray-600">

                      <div className="flex items-center gap-2">

                        <CalendarDays className="w-4 h-4" />

                        {new Date(
                          order.created_at
                        ).toLocaleDateString()}

                      </div>

                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-gray-500"
                  >
                    No orders found
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}