import Link from "next/link";

import {
  ArrowLeft,
  Package,
  ShoppingBag,
  IndianRupee,
  Wallet,
  Phone,
  Mail,
  CalendarDays,
  BadgeCheck,
  Store,
  CreditCard,
  MapPin,
  Banknote,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminSellerDetailsPage({
  params,
}: Props) {
  const { id } = await params;

  /* ============================= */
  /* FETCH SELLER */
  /* ============================= */

  const { data: seller, error } =
    await supabaseAdmin
      .from("users")
      .select(`
        *,
        products (
          id,
          name,
          status,
          approval_status,
          created_at,
          slug
        ),
        bank_accounts (
          id,
          account_holder_name,
          account_number,
          ifsc_code,
          bank_name,
          upi_id,
          is_verified
        ),
        seller_addresses (
          id,
          warehouse_name,
          contact_person,
          phone,
          address_line,
          city,
          state,
          pincode,
          is_default
        ),
        withdraw_requests (
          id,
          amount,
          status,
          created_at
        ),
        wallet_transactions (
          id,
          type,
          amount,
          note,
          created_at
        )
      `)
      .eq("id", id)
      .eq("role", "seller")
      .single();

  if (error || !seller) {
    notFound();
  }

  /* ============================= */
  /* FETCH ORDERS */
  /* ============================= */

  const { data: orders } =
    await supabaseAdmin
      .from("orders")
      .select(`
        id,
        total_amount,
        status,
        created_at,
        payment_status,
        seller_id
      `)
      .eq("seller_id", id)
      .order("created_at", {
        ascending: false,
      });

  /* ============================= */
  /* FETCH RETURNS */
  /* ============================= */

  const { data: returns } =
    await supabaseAdmin
      .from("returns")
      .select(`
        id,
        status,
        refund_amount,
        created_at,
        seller_id
      `)
      .eq("seller_id", id)
      .order("created_at", {
        ascending: false,
      });

  /* ============================= */
  /* FETCH WALLET */
  /* ============================= */

  const { data: walletData } =
    await supabaseAdmin
      .from("wallets")
      .select(`
        id,
        seller_id,
        balance,
        locked_balance
      `)
      .eq("seller_id", id)
      .single();

  /* ============================= */
  /* STATS */
  /* ============================= */

  const totalProducts =
    seller.products?.length || 0;

  const activeProducts =
    seller.products?.filter(
      (p: any) => p.status === "active"
    ).length || 0;

  const totalOrders =
    orders?.length || 0;

  const deliveredOrders =
    orders?.filter(
      (o: any) => o.status === "delivered"
    ).length || 0;

  const totalReturns =
    returns?.length || 0;

  const completedReturns =
    returns?.filter(
      (r: any) => r.status === "completed"
    ).length || 0;

  const pendingReturns =
    returns?.filter(
      (r: any) => r.status !== "completed"
    ).length || 0;

  const totalRevenue =
    orders?.reduce(
      (sum: number, order: any) =>
        sum + Number(order.total_amount || 0),
      0
    ) || 0;

  /* ============================= */
  /* DATA */
  /* ============================= */

  const wallet = walletData;

  const bank =
    seller.bank_accounts?.[0];

  const address =
    seller.seller_addresses?.[0];

  const isVerified =
    bank?.is_verified || false;

  return (
    <div className="p-6">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="flex items-center justify-between mb-8">

        <div>

          <Link
            href="/dashboard/admin/sellers"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sellers
          </Link>

          <div className="flex items-center gap-4">

            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Store className="w-8 h-8 text-blue-600" />
            </div>

            <div>

              <div className="flex items-center gap-2 flex-wrap">

                <h1 className="text-3xl font-bold">
                  {seller.name || "Unnamed Seller"}
                </h1>

                {isVerified ? (
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                    Pending
                  </span>
                )}

              </div>

              <div className="flex flex-wrap items-center gap-5 mt-3 text-sm text-gray-600">

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {seller.email}
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {seller.phone || "N/A"}
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Joined{" "}
                  {new Date(
                    seller.created_at
                  ).toLocaleDateString()}
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* STATS */}
      {/* ============================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        {/* REVENUE */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Total Revenue
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
                Products
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalProducts}
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                {activeProducts} active
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>

          </div>

        </div>

        {/* ORDERS */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Orders
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {totalOrders}
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                {deliveredOrders} delivered
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>

          </div>

        </div>

        {/* WALLET */}

        <div className="bg-white border rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Wallet Balance
              </p>

              <h2 className="text-3xl font-bold mt-2">
                ₹
                {Math.round(
                  Number(wallet?.balance || 0)
                )}
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Locked ₹
                {Math.round(
                  Number(
                    wallet?.locked_balance || 0
                  )
                )}
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-600" />
            </div>

          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* MAIN GRID */}
      {/* ============================= */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}

        <div className="lg:col-span-2 space-y-6">

          {/* PRODUCTS */}

          <div className="bg-white border rounded-2xl p-6">

            <div className="flex items-center gap-2 mb-5">

              <Package className="w-5 h-5" />

              <h2 className="text-xl font-bold">
                Products
              </h2>

            </div>

            <div className="space-y-4">

              {seller.products?.length ? (
                seller.products.map((product: any) => (
                  <div
                    key={product.id}
                    className="border rounded-xl p-4 flex items-center justify-between"
                  >

                    <div>

                      <h3 className="font-semibold">
                        {product.name}
                      </h3>

                      <div className="flex items-center gap-3 mt-2">

                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                          {product.status}
                        </span>

                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {product.approval_status}
                        </span>

                      </div>

                    </div>

                    <Link
                      href={`/product/${product.slug}`}
                      className="text-sm px-4 py-2 rounded-xl bg-black text-white"
                    >
                      View
                    </Link>

                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  No products found
                </p>
              )}

            </div>

          </div>

          {/* ORDERS */}

          <div className="bg-white border rounded-2xl p-6">

            <div className="flex items-center gap-2 mb-5">

              <ShoppingBag className="w-5 h-5" />

              <h2 className="text-xl font-bold">
                Recent Orders
              </h2>

            </div>

            <div className="space-y-4">

              {orders?.length ? (
                orders.slice(0, 10).map((order: any) => (
                  <div
                    key={order.id}
                    className="border rounded-xl p-4 flex items-center justify-between"
                  >

                    <div>

                      <h3 className="font-semibold">
                        #{order.id.slice(0, 8)}
                      </h3>

                      <div className="flex items-center gap-3 mt-2">

                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                          {order.status}
                        </span>

                        <span className="text-sm font-medium">
                          ₹
                          {Math.round(
                            Number(
                              order.total_amount || 0
                            )
                          )}
                        </span>

                      </div>

                    </div>

                    <p className="text-sm text-gray-500">
                      {new Date(
                        order.created_at
                      ).toLocaleDateString()}
                    </p>

                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  No orders found
                </p>
              )}

            </div>

          </div>

        </div>

        {/* RIGHT */}

        <div className="space-y-6">

          {/* BANK */}

          <div className="bg-white border rounded-2xl p-6">

            <div className="flex items-center gap-2 mb-5">

              <CreditCard className="w-5 h-5" />

              <h2 className="text-xl font-bold">
                Bank Account
              </h2>

            </div>

            {bank ? (
              <div className="space-y-4 text-sm">

                <div>

                  <p className="text-gray-500">
                    Account Holder
                  </p>

                  <p className="font-semibold">
                    {bank.account_holder_name}
                  </p>

                </div>

                <div>

                  <p className="text-gray-500">
                    Bank
                  </p>

                  <p className="font-semibold">
                    {bank.bank_name || "N/A"}
                  </p>

                </div>

                <div>

                  <p className="text-gray-500">
                    Account Number
                  </p>

                  <p className="font-semibold">
                    ****
                    {bank.account_number?.slice(-4)}
                  </p>

                </div>

                <div>

                  <p className="text-gray-500">
                    IFSC
                  </p>

                  <p className="font-semibold">
                    {bank.ifsc_code}
                  </p>

                </div>

                <div>

                  <p className="text-gray-500">
                    UPI
                  </p>

                  <p className="font-semibold">
                    {bank.upi_id || "N/A"}
                  </p>

                </div>

                <div>

                  {isVerified ? (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1 w-fit">

                      <ShieldCheck className="w-3 h-3" />

                      Verified

                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                      Pending Verification
                    </span>
                  )}

                </div>

              </div>
            ) : (
              <p className="text-gray-500">
                No bank account added
              </p>
            )}

          </div>

          {/* ADDRESS */}

          <div className="bg-white border rounded-2xl p-6">

            <div className="flex items-center gap-2 mb-5">

              <MapPin className="w-5 h-5" />

              <h2 className="text-xl font-bold">
                Warehouse Address
              </h2>

            </div>

            {address ? (
              <div className="space-y-3 text-sm">

                <div>

                  <p className="font-semibold">
                    {address.warehouse_name}
                  </p>

                  <p className="text-gray-500">
                    {address.contact_person}
                  </p>

                </div>

                <div>

                  <p>
                    {address.address_line}
                  </p>

                  <p>
                    {address.city}, {address.state}
                  </p>

                  <p>
                    {address.pincode}
                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <Phone className="w-4 h-4 text-gray-400" />

                  {address.phone}

                </div>

              </div>
            ) : (
              <p className="text-gray-500">
                No address found
              </p>
            )}

          </div>

          {/* RETURNS */}

          <div className="bg-white border rounded-2xl p-6">

            <div className="flex items-center gap-2 mb-5">

              <RotateCcw className="w-5 h-5" />

              <h2 className="text-xl font-bold">
                Returns
              </h2>

            </div>

            <div className="space-y-3">

              <div className="flex items-center justify-between">

                <span>Total Returns</span>

                <span className="font-bold">
                  {totalReturns}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span>Completed</span>

                <span className="font-bold text-green-600">
                  {completedReturns}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span>Pending</span>

                <span className="font-bold text-orange-600">
                  {pendingReturns}
                </span>

              </div>

            </div>

          </div>

          {/* WITHDRAWALS */}

          <div className="bg-white border rounded-2xl p-6">

            <div className="flex items-center gap-2 mb-5">

              <Banknote className="w-5 h-5" />

              <h2 className="text-xl font-bold">
                Withdraw Requests
              </h2>

            </div>

            <div className="space-y-4">

              {seller.withdraw_requests?.length ? (
                seller.withdraw_requests
                  .slice(0, 5)
                  .map((withdraw: any) => (
                    <div
                      key={withdraw.id}
                      className="border rounded-xl p-3"
                    >

                      <div className="flex items-center justify-between">

                        <span className="font-semibold">
                          ₹
                          {Math.round(
                            Number(
                              withdraw.amount || 0
                            )
                          )}
                        </span>

                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                          {withdraw.status}
                        </span>

                      </div>

                    </div>
                  ))
              ) : (
                <p className="text-gray-500">
                  No withdrawals
                </p>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}