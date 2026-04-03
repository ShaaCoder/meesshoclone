import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  Truck,
  Package,
  Clock,
} from "lucide-react";

export default async function OrderDetails({ params }: any) {
const { orderCode } = await params;

  type OrderStatus = "placed" | "processing" | "shipped" | "delivered";

  const supabase = await getSupabaseServer();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_code", orderCode)
    .single();

  if (!order) return notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*, products(*)")
    .eq("order_id", order.id);

  // 🔥 Timeline logic
  const steps = [
    { label: "Order Placed", icon: Clock },
    { label: "Processing", icon: Package },
    { label: "Shipped", icon: Truck },
    { label: "Delivered", icon: CheckCircle },
  ];

  const statusMap: Record<OrderStatus, number> = {
    placed: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
  };

  const currentStep =
    statusMap[(order.status as OrderStatus) || "placed"];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">
          Order #{order.order_code}
        </h1>

        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
          <p>Total: ₹{order.total_amount}</p>
          <p>Status: {order.status}</p>
          <p>Payment: {order.payment_status}</p>
        </div>
      </div>

      {/* 🚚 TRACKING SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow space-y-4">
        <h2 className="font-semibold">Shipping Details</h2>

        {order.awb_code ? (
          <div className="space-y-2 text-sm">
            <p><b>Courier:</b> {order.courier_name || "Shiprocket"}</p>
            <p><b>AWB:</b> {order.awb_code}</p>

            <a
              href={`https://shiprocket.co/tracking/${order.awb_code}`}
              target="_blank"
              className="inline-block text-blue-600 font-medium"
            >
              🚚 Track Order
            </a>

            {order.shipped_at && (
              <p>Shipped on: {new Date(order.shipped_at).toLocaleDateString()}</p>
            )}

            {order.delivered_at && (
              <p className="text-green-600">
                Delivered on: {new Date(order.delivered_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Shipment not created yet</p>
        )}
      </div>

      {/* 📦 STATUS TIMELINE */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="font-semibold mb-6">Order Status</h2>

        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active = index <= currentStep;

            return (
              <div
                key={step.label}
                className="flex-1 flex flex-col items-center relative"
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full 
                  ${
                    active
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <p className="text-sm mt-2">{step.label}</p>

                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-1 
                    ${
                      index < currentStep
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 📍 ADDRESS */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="font-semibold mb-3">Delivery Address</h2>

        <div className="text-sm text-gray-700">
          <p className="font-medium">{order.name}</p>
          <p>{order.phone}</p>
          <p>{order.address}</p>
          <p>
            {order.city}, {order.state} - {order.pincode}
          </p>
        </div>
      </div>

      {/* 📦 ITEMS */}
      <div className="bg-white p-6 rounded-2xl shadow space-y-4">
        <h2 className="font-semibold">Items</h2>

        {items?.map((item: any) => (
          <div
            key={item.id}
            className="flex gap-4 border p-4 rounded-xl hover:shadow transition"
          >
            <img
              src={item.products.image}
              className="w-24 h-24 object-cover rounded-lg"
            />

            <div className="flex-1">
              <h3 className="font-bold">
                {item.products.name}
              </h3>
              <p className="text-gray-500">
                ₹{item.base_price} × {item.quantity}
              </p>
            </div>

            <div className="font-semibold">
              ₹{item.base_price * item.quantity}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}