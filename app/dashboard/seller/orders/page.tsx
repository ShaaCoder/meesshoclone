import { getSupabaseServer } from "@/lib/supabase-server";
import { updateOrderStatus } from "@/app/actions/seller";
import { format } from "date-fns";
import { Truck } from "lucide-react";

type OrderItem = {
  id: string;
  order_id: string;
  quantity: number;
  price: number | null;
  cost_price?: number | null;
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
      cost_price,
      products(name, image),
      orders!inner(
        id,
        order_code,
        status,
        payment_status,
        payment_method,
        created_at
      )
    `)
    .eq("seller_id", user.id);

  if (error) {
    console.error(error);
    return <div>Error loading orders</div>;
  }

  /* ============================= */
  /* 🔥 GROUP */
  /* ============================= */
  const grouped: Record<string, any> = {};

  items?.forEach((item: any) => {
    if (!item.orders) return;

    if (!grouped[item.order_id]) {
      grouped[item.order_id] = {
        ...item.orders,
        items: [],
      };
    }

    grouped[item.order_id].items.push(item);
  });

  const orders = Object.values(grouped).sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">

      {orders.map((order: any) => {

        const sellerTotal = order.items.reduce(
          (sum: number, item: any) =>
            sum + (Number(item.cost_price) || 0) * item.quantity,
          0
        );

        return (
          <div key={order.id} className="bg-zinc-900 p-5 rounded-xl">

            {/* HEADER */}
            <div className="flex justify-between">
              <div>
                <p className="text-white font-semibold">
                  #{order.order_code}
                </p>
                <p className="text-sm text-gray-400">
                  {format(new Date(order.created_at), "dd MMM")}
                </p>
              </div>

              <div className="text-green-400 font-bold">
                ₹{sellerTotal}
              </div>
            </div>

            {/* ITEMS */}
            <div className="mt-4 space-y-2">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-3">

                  <img
                    src={item.products?.image || "/placeholder.png"}
                    className="w-14 h-14 rounded object-cover"
                  />

                  <div className="flex-1">
                    <p className="text-white text-sm">
                      {item.products?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  <div className="text-white text-sm">
                    ₹{item.cost_price}
                  </div>
                </div>
              ))}
            </div>

          <div className="mt-4 flex gap-2">

  {(order.status === "pending" || order.status === "placed") && (
    <>
      {/* ✅ ACCEPT */}
      <form action={updateOrderStatus.bind(null, order.id, "accepted")}>
        <button className="bg-green-600 px-3 py-1 rounded text-white">
          Accept
        </button>
      </form>

      {/* ❌ REJECT */}
      <form action={updateOrderStatus.bind(null, order.id, "rejected")}>
        <button className="bg-red-600 px-3 py-1 rounded text-white">
          Reject
        </button>
      </form>
    </>
  )}

  {order.status === "accepted" && (
    <span className="text-yellow-400 text-sm">
      Waiting for shipment
    </span>
  )}

  {order.status === "rejected" && (
    <span className="text-red-400 text-sm">
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

function Stat({ title, value }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}