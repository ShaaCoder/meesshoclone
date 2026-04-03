"use client";

import { useTransition } from "react";
import { placeOrder } from "@/app/actions/orders";
import { useRouter } from "next/navigation";

export default function PlaceOrderButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCOD = () => {
    startTransition(async () => {
      try {
        await placeOrder("cod");
        alert("Order placed (COD) ✅");
        router.push("/dashboard/user");
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handlePayment = () => {
    startTransition(async () => {
      try {
        const order = await placeOrder("online");

        if (!order?.id) throw new Error("Order failed");

        const res = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });

        const razorpayOrder = await res.json();

        if (!razorpayOrder?.id) {
          throw new Error("Razorpay failed");
        }

        if (!(window as any).Razorpay) {
          alert("Payment SDK not loaded");
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: "INR",
          order_id: razorpayOrder.id,

          handler: async function (response: any) {
            await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                orderId: order.id,
              }),
            });

            alert("Payment Successful ✅");
            router.push("/dashboard/user");
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Payment failed");
      }
    });
  };

  return (
    <div className="flex gap-4 mt-6">
      <button
        onClick={handleCOD}
        disabled={isPending}
        className="bg-gray-800 text-white px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {isPending ? "Processing..." : "Cash on Delivery"}
      </button>

      <button
        onClick={handlePayment}
        disabled={isPending}
        className="bg-black text-white px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {isPending ? "Processing..." : "Pay Online"}
      </button>
    </div>
  );
}