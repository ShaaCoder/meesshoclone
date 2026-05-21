"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { placeOrder } from "@/app/actions/orders";

type CheckoutFormProps = {
  user: any;
  addresses: any[];
};

type PlaceOrderResponse = {
  success: boolean;

  orderId: string;

  orderCode: string;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutForm({
  user,
  addresses,
}: CheckoutFormProps) {
  const router = useRouter();

  const [isPending, setIsPending] =
    useState(false);

  /* ============================= */
  /* 📍 DEFAULT ADDRESS */
  /* ============================= */

  const defaultAddress =
    addresses.find(
      (a) => a.is_default
    ) ||
    addresses[0] ||
    null;

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState<string>(
    defaultAddress?.id || ""
  );

  /* ============================= */
  /* 📝 FORM STATE */
  /* ============================= */

  const [formData, setFormData] =
    useState({
      name:
        user?.user_metadata?.name ||
        "",

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

      [e.target.name]:
        e.target.value,
    }));
  };

  /* ============================= */
  /* ✅ VALIDATION */
  /* ============================= */

  const validate = () => {
    if (selectedAddressId) {
      return true;
    }

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      alert(
        "Please fill all required fields"
      );

      return false;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        formData.phone
      )
    ) {
      alert(
        "Invalid phone number"
      );

      return false;
    }

    if (
      !/^\d{6}$/.test(
        formData.pincode
      )
    ) {
      alert(
        "Invalid pincode"
      );

      return false;
    }

    return true;
  };

  /* ============================= */
  /* 💳 LOAD RAZORPAY */
  /* ============================= */

  const loadRazorpay = () => {
    return new Promise<boolean>(
      (resolve) => {
        if (
          window.Razorpay
        ) {
          return resolve(true);
        }

        const script =
          document.createElement(
            "script"
          );

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () =>
          resolve(true);

        script.onerror = () =>
          resolve(false);

        document.body.appendChild(
          script
        );
      }
    );
  };

  /* ============================= */
  /* 🚀 MAIN SUBMIT */
  /* ============================= */

  const handleSubmit = async (
    paymentMethod:
      | "cod"
      | "online"
  ) => {
    if (isPending) return;

    if (!validate()) return;

    setIsPending(true);

    try {
      /* ============================= */
      /* 🧾 CREATE ORDER */
      /* ============================= */

      const order: PlaceOrderResponse =
        await placeOrder({
          paymentMethod,

          addressId:
            selectedAddressId ||
            undefined,

          ...(selectedAddressId
            ? {}
            : formData),
        });

      if (
        !order?.success ||
        !order?.orderId
      ) {
        throw new Error(
          "Order creation failed"
        );
      }

      /* ============================= */
      /* 💵 COD FLOW */
      /* ============================= */

      if (
        paymentMethod === "cod"
      ) {
        alert(
          "Order placed successfully ✅"
        );

        router.push(
          `/dashboard/user/orders/${order.orderCode}`
        );

        return;
      }

      /* ============================= */
      /* 💳 LOAD RAZORPAY */
      /* ============================= */

      const razorpayLoaded =
        await loadRazorpay();

      if (!razorpayLoaded) {
        throw new Error(
          "Failed to load Razorpay"
        );
      }

      /* ============================= */
      /* 💳 CREATE PAYMENT ORDER */
      /* ============================= */

      const res = await fetch(
        "/api/payment/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            orderId:
              order.orderId,
          }),
        }
      );

      let data: any = null;

      try {
        data =
          await res.json();
      } catch {
        throw new Error(
          "Invalid payment response"
        );
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Payment initialization failed"
        );
      }

      /* ============================= */
      /* 💳 RAZORPAY OPTIONS */
      /* ============================= */

      const options = {
        key: process.env
          .NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount:
          data.amount,

        currency:
          data.currency,

        order_id:
          data.id,

        name: "ShopSphere",

        description:
          "Order Payment",

        prefill: {
          name:
            formData.name,

          contact:
            formData.phone,
        },

        theme: {
          color: "#000000",
        },

        modal: {
          ondismiss:
            function () {
              console.log(
                "Payment popup closed"
              );

              alert(
                "Payment cancelled"
              );
            },
        },

        handler:
          async function (
            response: any
          ) {
            try {
              /* ============================= */
              /* ✅ VERIFY PAYMENT */
              /* ============================= */

              const verifyRes =
                await fetch(
                  "/api/payment/verify",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body: JSON.stringify(
                      {
                        ...response,

                        orderId:
                          order.orderId,
                      }
                    ),
                  }
                );

              let verifyData: any =
                null;

              try {
                verifyData =
                  await verifyRes.json();
              } catch {
                throw new Error(
                  "Invalid verify response"
                );
              }

              if (
                !verifyRes.ok
              ) {
                throw new Error(
                  verifyData?.error ||
                    "Payment verification failed"
                );
              }

              if (
                verifyData.success
              ) {
                alert(
                  "Payment successful 🎉"
                );

                router.push(
                  `/dashboard/user/orders/${order.orderCode}`
                );
              } else {
                throw new Error(
                  verifyData?.error ||
                    "Verification failed"
                );
              }
            } catch (
              error: any
            ) {
              console.error(
                "VERIFY ERROR:",
                error
              );

              alert(
                error?.message ||
                  "Payment verification failed"
              );
            }
          },
      };

      /* ============================= */
      /* 💳 OPEN RAZORPAY */
      /* ============================= */

      const rzp =
        new window.Razorpay(
          options
        );

      /* ============================= */
      /* ❌ PAYMENT FAILED */
      /* ============================= */

      rzp.on(
        "payment.failed",
        function (
          response: any
        ) {
          console.error(
            "PAYMENT FAILED:",
            response?.error
          );

          alert(
            response?.error
              ?.description ||
              "Payment failed ❌"
          );
        }
      );

      rzp.open();
    } catch (err: any) {
      console.error(
        "CHECKOUT ERROR:",
        err
      );

      alert(
        err?.message ||
          "Something went wrong"
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow border border-zinc-200 dark:border-zinc-800">
      <form className="space-y-5">
        {/* ============================= */}
        {/* 📍 ADDRESS SELECT */}
        {/* ============================= */}

        {addresses.length >
          0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Select Address
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedAddressId(
                    ""
                  )
                }
                className="text-xs underline text-zinc-600"
              >
                Use New Address
              </button>
            </div>

            <div className="space-y-3">
              {addresses.map(
                (a) => (
                  <label
                    key={a.id}
                    className={`block border rounded-2xl p-4 cursor-pointer transition ${
                      selectedAddressId ===
                      a.id
                        ? "border-black dark:border-white"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressId"
                      value={a.id}
                      checked={
                        selectedAddressId ===
                        a.id
                      }
                      onChange={() =>
                        setSelectedAddressId(
                          a.id
                        )
                      }
                      className="mr-2"
                    />

                    <span className="font-semibold">
                      {a.name}
                    </span>

                    <div className="text-sm text-zinc-500 mt-2">
                      {
                        a.address_line
                      }
                      , {a.city},{" "}
                      {a.state} -{" "}
                      {a.pincode}

                      <div>
                        {a.phone}
                      </div>
                    </div>
                  </label>
                )
              )}
            </div>
          </div>
        )}

        {/* ============================= */}
        {/* 📝 NEW ADDRESS */}
        {/* ============================= */}

        {!selectedAddressId && (
          <>
            <input
              type="text"
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              placeholder="Full Name"
              className="w-full px-4 py-3 border rounded-xl"
            />

            <input
              type="tel"
              name="phone"
              value={
                formData.phone
              }
              onChange={
                handleChange
              }
              placeholder="Phone Number"
              className="w-full px-4 py-3 border rounded-xl"
            />

            <input
              type="text"
              name="address"
              value={
                formData.address
              }
              onChange={
                handleChange
              }
              placeholder="Full Address"
              className="w-full px-4 py-3 border rounded-xl"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="city"
                value={
                  formData.city
                }
                onChange={
                  handleChange
                }
                placeholder="City"
                className="px-4 py-3 border rounded-xl"
              />

              <input
                type="text"
                name="pincode"
                value={
                  formData.pincode
                }
                onChange={
                  handleChange
                }
                placeholder="Pincode"
                className="px-4 py-3 border rounded-xl"
              />
            </div>

            <input
              type="text"
              name="state"
              value={
                formData.state
              }
              onChange={
                handleChange
              }
              placeholder="State"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </>
        )}

        {/* ============================= */}
        {/* 💳 BUTTONS */}
        {/* ============================= */}

        <div className="pt-6 space-y-3">
          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              handleSubmit(
                "cod"
              )
            }
            className="w-full bg-zinc-800 hover:bg-zinc-900 text-white py-4 rounded-xl font-medium transition disabled:opacity-50"
          >
            {isPending
              ? "Processing..."
              : "Cash on Delivery"}
          </button>

          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              handleSubmit(
                "online"
              )
            }
            className="w-full bg-black hover:bg-zinc-900 text-white py-4 rounded-xl font-medium transition disabled:opacity-50"
          >
            {isPending
              ? "Processing..."
              : "Pay Online"}
          </button>
        </div>
      </form>
    </div>
  );
}