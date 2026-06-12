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

  totalAmount?: number;
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

  const router =
    useRouter();

  const [
    isPending,
    setIsPending,
  ] = useState(false);

  /* =========================================================
     📍 DEFAULT ADDRESS
  ========================================================= */

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

  /* =========================================================
     📝 FORM STATE
  ========================================================= */

  const [
    formData,
    setFormData,
  ] = useState({
    name:
      user?.user_metadata
        ?.name || "",

    phone:
      defaultAddress?.phone ||
      "",

    address: "",

    city: "",

    state: "",

    pincode: "",
  });

  /* =========================================================
     🔄 INPUT CHANGE
  ========================================================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    setFormData(
      (prev) => ({
        ...prev,

        [e.target.name]:
          e.target.value,
      })
    );
  };

  /* =========================================================
     ✅ VALIDATION
  ========================================================= */

  const validate = () => {

    if (
      selectedAddressId
    ) {
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

  /* =========================================================
     💳 LOAD RAZORPAY
  ========================================================= */

  const loadRazorpay =
    () => {

      return new Promise<boolean>(
        (
          resolve
        ) => {

          if (
            window.Razorpay
          ) {

            return resolve(
              true
            );
          }

          const script =
            document.createElement(
              "script"
            );

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.async =
            true;

          script.onload =
            () => {

              console.log(
                "✅ RAZORPAY SDK LOADED"
              );

              resolve(
                true
              );
            };

          script.onerror =
            () => {

              console.error(
                "❌ RAZORPAY SDK FAILED"
              );

              resolve(
                false
              );
            };

          document.body.appendChild(
            script
          );
        }
      );
    };

  /* =========================================================
     ❌ PAYMENT FAILED
  ========================================================= */

  const markPaymentFailed =
    async (
      orderId: string,
      reason?: string
    ) => {

      try {

        await fetch(
          "/api/payment/fail",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  orderId,
                  reason,
                }
              ),
          }
        );

      } catch (
        error
      ) {

        console.error(
          "❌ FAILED TO MARK PAYMENT FAILED:",
          error
        );
      }
    };

  /* =========================================================
     🚀 MAIN SUBMIT
  ========================================================= */

  const handleSubmit =
    async (
      paymentMethod:
        | "cod"
        | "online"
    ) => {

      if (
        isPending
      ) {
        return;
      }

      if (
        !validate()
      ) {
        return;
      }

      let createdOrder:
        | PlaceOrderResponse
        | undefined;

      try {

        setIsPending(
          true
        );

        console.log(
          "🚀 START CHECKOUT"
        );

        /* =========================================================
           🧾 CREATE ORDER
        ========================================================= */

        createdOrder =
          await placeOrder(
            {
              paymentMethod,

              addressId:
                selectedAddressId ||
                undefined,

              ...(selectedAddressId
                ? {}
                : formData),
            }
          );

        console.log(
          "🧾 ORDER RESPONSE:",
          createdOrder
        );

        if (
          !createdOrder
            ?.success ||
          !createdOrder
            ?.orderId
        ) {

          throw new Error(
            "Order creation failed"
          );
        }

        /* =========================================================
           💵 COD
        ========================================================= */

        if (
          paymentMethod ===
          "cod"
        ) {

          alert(
            "Order placed successfully ✅"
          );

          router.push(
            `/dashboard/user/orders/${createdOrder.orderCode}`
          );

          return;
        }

        /* =========================================================
           💳 LOAD RAZORPAY
        ========================================================= */

        const razorpayLoaded =
          await loadRazorpay();

        if (
          !razorpayLoaded
        ) {

          await markPaymentFailed(
            createdOrder.orderId,
            "Failed to load Razorpay SDK"
          );

          throw new Error(
            "Failed to load Razorpay SDK"
          );
        }

        /* =========================================================
           💳 CREATE RAZORPAY ORDER
        ========================================================= */

        const paymentRes =
          await fetch(
            "/api/payment/create-order",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    orderId:
                      createdOrder.orderId,
                  }
                ),
            }
          );

        const paymentData =
          await paymentRes.json();

        console.log(
          "💳 PAYMENT RESPONSE:",
          paymentData
        );

        if (
          !paymentRes.ok
        ) {

          await markPaymentFailed(
            createdOrder.orderId,
            paymentData?.error
          );

          throw new Error(
            paymentData?.error ||
              "Failed to create payment order"
          );
        }

        /* =========================================================
           ✅ IMPORTANT FIX
        ========================================================= */

        const razorpayOrder =
          paymentData.razorpayOrder;

        if (
          !razorpayOrder?.id
        ) {

          throw new Error(
            "Invalid Razorpay order response"
          );
        }

        /* =========================================================
           💳 OPTIONS
        ========================================================= */

        const options = {

          key:
            process.env
              .NEXT_PUBLIC_RAZORPAY_KEY_ID,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency,

          order_id:
            razorpayOrder.id,

          name:
            "YourShop",

          description:
            "Order Payment",

          image:
            "/logo.png",

          prefill: {

            name:
              user?.user_metadata
                ?.name || "",

            email:
              user?.email || "",

            contact:
              formData.phone ||
              addresses?.[0]
                ?.phone ||
              "",
          },

          notes: {

            internal_order_id:
              createdOrder.orderId,
          },

          theme: {
            color:
              "#000000",
          },

          retry: {
            enabled:
              true,
          },

          modal: {

            escape:
              false,

            ondismiss:
              async function () {

                console.log(
                  "❌ PAYMENT POPUP CLOSED"
                );

                await markPaymentFailed(
                  createdOrder!.orderId,
                  "Payment popup closed"
                );

                alert(
                  "Payment cancelled"
                );
              },
          },

          /* =========================================================
             ✅ SUCCESS
          ========================================================= */

          handler:
            async function (
              response: any
            ) {

              console.log(
                "✅ RAZORPAY SUCCESS:",
                response
              );

              /* =========================================================
                 ✅ VALIDATION
              ========================================================= */

              if (
                !response
                  ?.razorpay_payment_id ||
                !response
                  ?.razorpay_order_id ||
                !response
                  ?.razorpay_signature
              ) {

                console.error(
                  "❌ INVALID RAZORPAY RESPONSE",
                  response
                );

                await markPaymentFailed(
                  createdOrder!.orderId,
                  "Missing Razorpay response fields"
                );

                alert(
                  "Payment verification failed"
                );

                return;
              }

              try {

                /* =========================================================
                   ✅ VERIFY
                ========================================================= */

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

                      body:
                        JSON.stringify(
                          {
                            razorpay_order_id:
                              response.razorpay_order_id,

                            razorpay_payment_id:
                              response.razorpay_payment_id,

                            razorpay_signature:
                              response.razorpay_signature,

                            orderId:
                              createdOrder!.orderId,
                          }
                        ),
                    }
                  );

                const verifyData =
                  await verifyRes.json();

                console.log(
                  "✅ VERIFY RESPONSE:",
                  verifyData
                );

                if (
                  !verifyRes.ok
                ) {

                  await markPaymentFailed(
                    createdOrder!.orderId,
                    verifyData?.error
                  );

                  throw new Error(
                    verifyData?.error ||
                    "Payment verification failed"
                  );
                }

                alert(
                  "Payment successful 🎉"
                );

                router.push(
                  `/dashboard/user/orders/${createdOrder!.orderCode}`
                );

              } catch (
                error: any
              ) {

                console.error(
                  "❌ VERIFY ERROR:",
                  error
                );

                await markPaymentFailed(
                  createdOrder!.orderId,
                  error?.message
                );

                alert(
                  error?.message ||
                  "Verification failed"
                );
              }
            },
        };

        console.log(
          "💳 RAZORPAY OPTIONS:",
          options
        );

        /* =========================================================
           🚀 OPEN RAZORPAY
        ========================================================= */

        const razorpay =
          new window.Razorpay(
            options
          );

        /* =========================================================
           ❌ PAYMENT FAILED
        ========================================================= */

        razorpay.on(
          "payment.failed",

          async function (
            response: any
          ) {

            console.error(
              "❌ PAYMENT FAILED:",
              response
            );

            await markPaymentFailed(
              createdOrder!.orderId,

              response?.error
                ?.description ||
                "Payment failed"
            );

            alert(
              response?.error
                ?.description ||
              "Payment failed ❌"
            );
          }
        );

        razorpay.open();

      } catch (
        err: any
      ) {

        console.error(
          "❌ CHECKOUT ERROR:",
          err
        );

        if (
          createdOrder?.orderId &&
          paymentMethod ===
            "online"
        ) {

          await markPaymentFailed(
            createdOrder.orderId,
            err?.message
          );
        }

        alert(
          err?.message ||
            "Something went wrong"
        );

      } finally {

        setIsPending(
          false
        );
      }
    };

  return (

    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow border border-zinc-200 dark:border-zinc-800">

      <form className="space-y-5">

        {/* =========================================================
           📍 ADDRESS SELECT
        ========================================================= */}

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
                      ,{" "}
                      {a.city}
                      ,{" "}
                      {a.state}
                      {" - "}
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

        {/* =========================================================
           📝 NEW ADDRESS
        ========================================================= */}

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

        {/* =========================================================
           💳 BUTTONS
        ========================================================= */}

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