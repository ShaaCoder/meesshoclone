import { getSupabaseServer } from "@/lib/supabase-server";
import { updateOrderStatus } from "@/app/actions/seller";

type OrderItem = {
  id: string;
  order_id: string;
  quantity: number;
  price: number | null;
  selling_price?: number | null;
  base_price?: number | null;
  products: any;
  orders: any;
};

export default async function SellerOrdersPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 📦 FETCH ORDER ITEMS */
  /* ============================= */
  const { data: items, error } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      quantity,
      price,
      selling_price,
      base_price,
      products(*),
      orders(*)
    `)
    .eq("seller_id", user.id);

  if (error) {
    console.error("FETCH ERROR:", error);
    return <div>Error loading orders</div>;
  }

  console.log("🧪 FETCHED ITEMS:", items);

  /* ============================= */
  /* 🔥 GROUP BY ORDER */
  /* ============================= */
  const groupedOrders: Record<string, any> = {};

  (items || []).forEach((item: OrderItem) => {
    if (!item.orders) return;

    const orderId = item.order_id;

    if (!groupedOrders[orderId]) {
      groupedOrders[orderId] = {
        ...item.orders,
        items: [],
      };
    }

    groupedOrders[orderId].items.push(item);
  });

  /* ============================= */
  /* ✅ SORT LATEST FIRST (FIXED) */
  /* ============================= */
  const sellerOrders = Object.values(groupedOrders).sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500">Manage your incoming orders</p>
      </div>

      {/* EMPTY */}
      {sellerOrders.length === 0 && (
        <div className="bg-white p-10 rounded-xl text-center text-gray-500">
          No orders yet
        </div>
      )}

      {/* LIST */}
      {sellerOrders.map((order: any) => {
        const isPaid =
          order.payment_method === "cod" ||
          order.payment_status === "paid";

        /* 💰 CORRECT SELLER EARNING */
        const sellerTotal = (order.items || []).reduce(
          (sum: number, item: OrderItem) => {
            const price =
              Number(item.base_price) || // ✅ seller earning
              Number(item.price) ||
              0;

            return sum + item.quantity * price;
          },
          0
        );

        return (
          <div
            key={order.id}
            className="bg-white p-6 rounded-2xl shadow space-y-4 text-black"
          >

            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">
                #{order.order_code || order.id?.slice(0, 8)}
              </h2>

              <div className="flex gap-2">
                <span className="px-3 py-1 rounded bg-gray-100 text-xs">
                  {order.status}
                </span>

                <span
                  className={`px-3 py-1 rounded text-xs ${
                    isPaid
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
            </div>

            {/* ITEMS */}
            <div className="space-y-3">
              {(order.items || []).map((item: OrderItem) => {
                const price =
                  Number(item.base_price) || // ✅ seller earning
                  Number(item.price) ||
                  0;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 border p-3 rounded"
                  >

                    <img
                      src={item.products?.image || "/placeholder.png"}
                      className="w-16 h-16 rounded object-cover"
                    />

                    <div className="flex-1">
                      <p className="font-semibold">
                        {item.products?.name || "Product"}
                      </p>

                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>

                      <p className="text-sm">₹{price}</p>
                    </div>

                    <p className="font-semibold">
                      ₹{item.quantity * price}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* TOTAL */}
            <div className="flex justify-between font-semibold text-lg">
              <span>Your Earnings</span>
              <span className="text-green-600">₹{sellerTotal}</span>
            </div>

            {/* ACTIONS */}
      <div className="flex gap-2">

  {/* ✅ ACCEPT */}
  {(order.status === "placed" || order.status === "pending") && (
    <form action={updateOrderStatus.bind(null, order.id, "accepted")}>
      <button className="bg-green-600 text-white px-4 py-2 rounded">
        Accept
      </button>
    </form>
  )}

  {/* ❌ REJECT */}
  {(order.status === "placed" || order.status === "pending") && (
    <form action={updateOrderStatus.bind(null, order.id, "rejected")}>
      <button className="bg-red-600 text-white px-4 py-2 rounded">
        Reject
      </button>
    </form>
  )}

  {/* 🕒 WAITING */}
  {order.status === "accepted" && (
    <span className="text-yellow-600 font-medium">
      Waiting for Admin 🚚
    </span>
  )}

  {/* ❌ REJECTED */}
  {order.status === "rejected" && (
    <span className="text-red-600 font-medium">
      Order Rejected
    </span>
  )}

</div>

          </div>
        );
      })}
    </div>
  );
}