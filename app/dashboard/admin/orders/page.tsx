import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  markSellerPaid,
  createShipmentByAdmin,
  retryCourierAssign,
  markOrderDelivered, // ✅ IMPORTANT
} from "@/app/actions/admin";

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

  if (profile?.role !== "admin") {
    return redirect("/login");
  }

  /* ============================= */
  /* 📦 FETCH DATA */
  /* ============================= */
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("order_id, quantity, price, cost_price");

  /* ============================= */
  /* 🔥 GROUP ITEMS */
  /* ============================= */
  const map: Record<string, any[]> = {};

  (items || []).forEach((item: any) => {
    if (!map[item.order_id]) map[item.order_id] = [];
    map[item.order_id].push(item);
  });

  /* ============================= */
  /* 📊 STATS */
  /* ============================= */
  let revenue = 0;
  let profit = 0;

  (orders || []).forEach((order: any) => {
    if (order.payment_status === "paid") {
      revenue += Number(order.total_amount || 0);

      const orderItems = map[order.id] || [];

      orderItems.forEach((item: any) => {
        profit +=
          (Number(item.price) - Number(item.cost_price)) *
          item.quantity;
      });
    }
  });

  const paidOrders =
    orders?.filter((o) => o.payment_status === "paid").length || 0;

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Orders Management</h1>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <Stat title="Total Orders" value={orders?.length || 0} />
        <Stat title="Revenue" value={`₹${revenue}`} />
        <Stat title="Profit" value={`₹${profit}`} />
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
              <th className="p-3">Payout</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders?.map((order: any) => {

              const orderItems = map[order.id] || [];

              const orderProfit = orderItems.reduce(
                (sum: number, item: any) =>
                  sum +
                  (Number(item.price) - Number(item.cost_price)) *
                    item.quantity,
                0
              );

              const isCourierPending =
                order.courier_name === "Pending Assignment";

              return (
                <tr key={order.id} className="border-t">

                  <td className="p-3 font-mono">
                    #{order.order_code}
                  </td>

                  <td className="p-3 font-semibold">
                    ₹{order.total_amount}
                  </td>

                  <td className="p-3 text-green-600 font-semibold">
                    ₹{orderProfit}
                  </td>

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

                  <td className="p-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {order.status}
                    </span>
                  </td>

                  {/* SHIPMENT */}
                  <td className="p-3 text-xs">
                    {isCourierPending ? (
                      <form action={retryCourierAssign.bind(null, order.id)}>
                        <button className="text-yellow-600 underline">
                          Retry Courier
                        </button>
                      </form>
                    ) : order.awb_code ? (
                      <a
                        href={`https://shiprocket.co/tracking/${order.awb_code}`}
                        target="_blank"
                        className="text-blue-500"
                      >
                        Track
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        Not Shipped
                      </span>
                    )}
                  </td>

                  {/* PAYOUT */}
                  <td className="p-3">
                    {order.seller_paid ? (
                      <span className="text-green-600 text-xs">
                        Paid
                      </span>
                    ) : (
                      <span className="text-yellow-600 text-xs">
                        Pending
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="p-3 space-y-2 flex flex-col">

                    {/* CREATE SHIPMENT */}
                    {order.payment_status === "paid" &&
                      !order.shipment_id && (
                        <form action={createShipmentByAdmin.bind(null, order.id)}>
                          <button className="bg-black text-white px-3 py-1 rounded text-xs">
                            Create Shipment
                          </button>
                        </form>
                      )}

                    {/* MARK DELIVERED ✅ FIXED */}
                    {order.status === "shipped" &&
                      order.payment_status === "paid" && (
                        <form action={markOrderDelivered.bind(null, order.id)}>
                          <button className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                            Mark Delivered
                          </button>
                        </form>
                      )}

                    {/* PAY SELLER */}
                    {order.payment_status === "paid" &&
                      order.status === "delivered" &&
                      !order.seller_paid && (
                        <form action={markSellerPaid.bind(null, order.id)}>
                          <button className="bg-green-700 text-white px-3 py-1 rounded text-xs">
                            Pay Seller
                          </button>
                        </form>
                      )}

                    {/* DONE */}
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

/* ============================= */
function Stat({ title, value }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}