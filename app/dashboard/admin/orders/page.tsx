import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { updateOrderStatus } from "@/app/actions/seller";
import { markSellerPaid, createShipmentByAdmin } from "@/app/actions/admin";

export default async function OrdersPage() {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 ADMIN CHECK */
  /* ============================= */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return redirect("/login");
  }

  /* ============================= */
  /* 📦 FETCH ORDERS */
  /* ============================= */
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  /* ============================= */
  /* 📊 STATS */
  /* ============================= */
  const revenue =
    orders?.reduce((sum, o) => {
      if (o.payment_status === "paid") {
        const profit =
          Number(o.total_amount || 0) -
          Number(o.seller_payout || 0);
        return sum + profit;
      }
      return sum;
    }, 0) || 0;

  const paidOrders =
    orders?.filter((o) => o.payment_status === "paid").length || 0;

  return (
    <div className="space-y-6 text-black">
      <h1 className="text-3xl font-bold">Orders Management</h1>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat title="Total Orders" value={orders?.length || 0} />
        <Stat title="Profit (Admin)" value={`₹${revenue}`} />
        <Stat title="Paid Orders" value={paidOrders} />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Profit</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Shipment</th>
              <th className="p-3">Date</th>
              <th className="p-3">Payout</th>
              <th className="p-3">Payout Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders?.map((order: any) => {
              const profit =
                Number(order.total_amount || 0) -
                Number(order.seller_payout || 0);

              return (
                <tr key={order.id} className="border-t">

                  {/* ORDER */}
                  <td className="p-3 font-mono">
                    #{order.order_code}
                  </td>

                  {/* AMOUNT */}
                  <td className="p-3 font-semibold">
                    ₹{order.total_amount}
                  </td>

                  {/* PROFIT */}
                  <td className="p-3 text-green-600 font-semibold">
                    ₹{profit}
                  </td>

                  {/* PAYMENT */}
                  <td className="p-3">
                    {order.payment_method} /
                    <span
                      className={`ml-1 font-semibold ${
                        order.payment_status === "paid"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {order.payment_status === "paid"
                        ? "Paid"
                        : "Unpaid"}
                    </span>
                  </td>

                  {/* STATUS */}
                  <td className="p-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {order.status}
                    </span>
                  </td>

                  {/* 🚚 SHIPMENT */}
                  <td className="p-3 text-xs">
                    {order.awb_code ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-green-600 font-medium">
                          {order.courier_name || "Shiprocket"}
                        </span>
                        <a
                          href={`https://shiprocket.co/tracking/${order.awb_code}`}
                          target="_blank"
                          className="text-blue-500"
                        >
                          Track
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        Not Shipped
                      </span>
                    )}
                  </td>

                  {/* DATE */}
                  <td className="p-3 text-xs">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>

                  {/* PAYOUT */}
                  <td className="p-3 font-semibold">
                    ₹{order.seller_payout || 0}
                  </td>

                  {/* PAYOUT STATUS */}
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        order.seller_paid
                          ? "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {order.seller_paid ? "Paid" : "Pending"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-3 space-y-1 flex flex-col">

                    {/* ❌ PAYMENT BLOCK */}
                    {order.payment_status !== "paid" && (
                      <span className="text-red-500 text-xs">
                        Payment Pending
                      </span>
                    )}

                    {/* 🚚 CREATE SHIPMENT */}
                    {order.payment_status === "paid" &&
                      !order.awb_code && (
                        <form
                          action={createShipmentByAdmin.bind(
                            null,
                            order.id
                          )}
                        >
                          <button className="bg-black text-white px-3 py-1 rounded text-xs">
                            Create Shipment
                          </button>
                        </form>
                      )}

                    {/* 📦 MARK DELIVERED */}
                    {order.status === "shipped" && (
                      <form
                        action={updateOrderStatus.bind(
                          null,
                          order.id,
                          "delivered"
                        )}
                      >
                        <button className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                          Mark Delivered
                        </button>
                      </form>
                    )}

                    {/* 💰 PAY SELLER */}
                    {order.payment_status === "paid" &&
                      order.status === "delivered" &&
                      !order.seller_paid && (
                        <form
                          action={markSellerPaid.bind(
                            null,
                            order.id
                          )}
                        >
                          <button className="bg-green-700 text-white px-3 py-1 rounded text-xs">
                            Pay Seller
                          </button>
                        </form>
                      )}

                    {/* ✅ DONE */}
                    {order.status === "delivered" &&
                      order.seller_paid && (
                        <span className="text-green-600 text-xs font-semibold">
                          Completed
                        </span>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ title, value }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}