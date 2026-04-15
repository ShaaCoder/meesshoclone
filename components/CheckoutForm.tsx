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

  /* ============================= */
  /* 🔄 INPUT CHANGE */
  /* ============================= */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /* ============================= */
  /* ✅ VALIDATION */
  /* ============================= */
  const validate = () => {
    if (!formData.name || !formData.phone || !formData.address) {
      alert("Please fill all required fields");
      return false;
    }

    if (formData.phone.length < 10) {
      alert("Invalid phone number");
      return false;
    }

    if (formData.pincode.length < 5) {
      alert("Invalid pincode");
      return false;
    }

    return true;
  };

  /* ============================= */
  /* 💳 LOAD RAZORPAY SCRIPT (ONCE) */
  /* ============================= */
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  /* ============================= */
  /* 🚀 MAIN SUBMIT */
  /* ============================= */
  const handleSubmit = async (paymentMethod: "cod" | "online") => {
    if (isPending) return; // prevent double click
    if (!validate()) return;

    setIsPending(true);

    try {
      /* ============================= */
      /* 🧾 CREATE ORDER */
      /* ============================= */
      const order = await placeOrder({
        paymentMethod,
        ...formData,
      });

      if (!order?.id) throw new Error("Order failed");

      /* ============================= */
      /* 💵 COD FLOW */
      /* ============================= */
      if (paymentMethod === "cod") {
        alert("Order placed successfully ✅");
        window.location.href = "/dashboard/user";
        return;
      }

      /* ============================= */
      /* 💳 ONLINE PAYMENT FLOW */
      /* ============================= */

      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error("Payment SDK failed to load");
      }

      /* CREATE RAZORPAY ORDER */
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment init failed");
      }

      /* ============================= */
      /* 💳 OPEN CHECKOUT */
      /* ============================= */
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        order_id: data.id,

        name: "Your Store",
        description: "Order Payment",

        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                orderId: order.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              alert("Payment successful 🎉");
              window.location.href = "/dashboard/user";
            } else {
              alert("Payment verification failed");
            }
          } catch (err) {
            alert("Verification error");
          }
        },

        modal: {
          ondismiss: function () {
            alert("Payment cancelled ❌");
          },
        },

        prefill: {
          name: formData.name,
          contact: formData.phone,
        },

        theme: {
          color: "#000000",
        },
      };

      const rzp = new (window as any).Razorpay(options);

      /* ❌ PAYMENT FAILED HANDLER */
      rzp.on("payment.failed", function (response: any) {
        console.error(response.error);
        alert("Payment failed ❌");
      });

      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <form className="space-y-5">

        {/* NAME */}
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full Name"
          className="w-full px-4 py-3 border rounded-lg"
        />

        {/* PHONE */}
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Phone Number"
          className="w-full px-4 py-3 border rounded-lg"
        />

        {/* ADDRESS */}
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Full Address"
          className="w-full px-4 py-3 border rounded-lg"
        />

        {/* CITY + PINCODE */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="px-4 py-3 border rounded-lg"
          />

          <input
            type="text"
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            placeholder="Pincode"
            className="px-4 py-3 border rounded-lg"
          />
        </div>

        {/* STATE */}
        <input
          type="text"
          name="state"
          value={formData.state}
          onChange={handleChange}
          placeholder="State"
          className="w-full px-4 py-3 border rounded-lg"
        />

        {/* BUTTONS */}
        <div className="pt-6 space-y-3">
          <button
            type="button"
            onClick={() => handleSubmit("cod")}
            disabled={isPending}
            className="w-full bg-gray-800 text-white py-4 rounded-xl"
          >
            {isPending ? "Processing..." : "Cash on Delivery"}
          </button>

          <button
            type="button"
            onClick={() => handleSubmit("online")}
            disabled={isPending}
            className="w-full bg-black text-white py-4 rounded-xl"
          >
            {isPending ? "Processing..." : "Pay Online"}
          </button>
        </div>
      </form>
    </div>
  );
}