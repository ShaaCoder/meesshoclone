"use client";

import { useState } from "react";
import { placeOrder } from "@/app/actions/orders";

type CheckoutFormProps = {
  user: any;
};

export default function CheckoutForm({ user }: CheckoutFormProps) {
  const [isPending, setIsPending] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (paymentMethod: "cod" | "online") => {
  setIsPending(true);

  try {
    /* ============================= */
    /* 🧾 STEP 1: CREATE DB ORDER */
    /* ============================= */
    const order = await placeOrder({
      paymentMethod,
      ...formData,
    });

    console.log("🧾 ORDER CREATED:", order);

    if (paymentMethod === "cod") {
      alert("Order Placed Successfully ✅");
      window.location.href = "/dashboard/user";
      return;
    }

    /* ============================= */
    /* 💳 STEP 2: CREATE RAZORPAY ORDER */
    /* ============================= */
    const res = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: order.id, // ✅ FIXED
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Payment init failed");
    }

    /* ============================= */
    /* 💳 STEP 3: LOAD RAZORPAY */
    /* ============================= */
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    /* ============================= */
    /* 💳 STEP 4: OPEN CHECKOUT */
    /* ============================= */
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      order_id: data.id,

      name: "Your Store",

      handler: async function (response: any) {
        const verifyRes = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...response,
            orderId: order.id,
          }),
        });

        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          alert("Payment Successful 🎉");
          window.location.href = "/dashboard/user";
        } else {
          alert("Payment verification failed");
        }
      },

      prefill: {
        name: formData.name,
        contact: formData.phone,
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();

  } catch (err: any) {
    console.error(err);
    alert(err.message);
  } finally {
    setIsPending(false);
  }
};
  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <form className="space-y-5">
        
        {/* NAME */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        {/* PHONE */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        {/* ADDRESS */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Full Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="House no, Street, Locality"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        {/* CITY + PINCODE */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Pincode
            </label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* STATE */}
        <div>
          <label className="block text-sm font-medium mb-1">
            State
          </label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        {/* BUTTONS */}
        <div className="pt-6 space-y-3">
          <button
            type="button"
            onClick={() => handleSubmit("cod")}
            disabled={isPending}
            className="w-full bg-gray-800 text-white py-4 rounded-xl font-semibold disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Cash on Delivery"}
          </button>

          <button
            type="button"
            onClick={() => handleSubmit("online")}
            disabled={isPending}
            className="w-full bg-black text-white py-4 rounded-xl font-semibold disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Pay Online Now"}
          </button>
        </div>
      </form>
    </div>
  );
}