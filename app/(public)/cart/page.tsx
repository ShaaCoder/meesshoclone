import { getSupabaseServer } from "@/lib/supabase-server";

import { redirect } from "next/navigation";

import Link from "next/link";

import CartItem from "@/components/CartItem";

import CheckoutForm from "@/components/CheckoutForm";

import {
  ArrowLeft,
  ShoppingCart,
  ShieldCheck,
  Truck,
} from "lucide-react";

/* =========================================================
   🧠 PRICE ENGINE
========================================================= */

function getPrice(
  variant: any
) {

  if (!variant) {
    return 0;
  }

  /* ============================= */
  /* ✅ SELLING PRICE */
  /* ============================= */

  if (
    Number(
      variant.selling_price
    ) > 0
  ) {

    return Number(
      variant.selling_price
    );
  }

  /* ============================= */
  /* 🔥 FALLBACK */
  /* ============================= */

  const fallback =
    Number(
      variant.cost_price ||
        0
    ) +
    Number(
      variant.platform_margin ||
        0
    );

  if (fallback > 0) {

    return fallback;
  }

  /* ============================= */
  /* 💰 LAST MRP */
  /* ============================= */

  if (
    Number(
      variant.mrp
    ) > 0
  ) {

    return Number(
      variant.mrp
    );
  }

  return 0;
}

/* =========================================================
   🖼 GET VARIANT IMAGE
========================================================= */

function getVariantImage(
  product: any,
  variant: any
) {

  const images =
    product?.product_images ||
    [];

  /* ============================= */
  /* 🎨 GET VARIANT COLOR */
  /* ============================= */

  const variantColor =
    variant?.color
      ? String(
          variant.color
        ).toLowerCase()
      : variant?.attributes
          ?.color
      ? String(
          variant.attributes
            .color
        ).toLowerCase()
      : null;

  /* ============================= */
  /* 🎨 MATCH COLOR IMAGE */
  /* ============================= */

  if (
    variantColor
  ) {

    const matched =
      images.find(
        (img: any) => {

          if (
            !img?.color
          ) {
            return false;
          }

          return (
            String(
              img.color
            ).toLowerCase() ===
            variantColor
          );
        }
      );

    if (
      matched?.url
    ) {

      return matched.url;
    }
  }

  /* ============================= */
  /* ⭐ PRIMARY */
  /* ============================= */

  const primary =
    images.find(
      (img: any) =>
        img.is_primary
    );

  if (
    primary?.url
  ) {

    return primary.url;
  }

  /* ============================= */
  /* 📦 FIRST */
  /* ============================= */

  if (
    images?.[0]?.url
  ) {

    return images[0].url;
  }

  return "/placeholder.svg";
}

/* =========================================================
   📦 PAGE
========================================================= */

export default async function CartPage() {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */

  if (!user) {

    return redirect(
      "/login"
    );
  }

  /* =========================================================
     🛒 FETCH CART
  ========================================================= */

  const {
    data: cart,
    error: cartError,
  } = await supabase
    .from("cart")
    .select(`
      id,
      quantity,
      created_at,

      products:product_id (
        id,
        name,
        slug,

        categories (
          gst_percent
        ),

        product_images (
          url,
          color,
          is_primary
        )
      ),

      product_variants:variant_id (
        id,

        size,
        color,

        attributes,

        stock,
        reserved_stock,

        selling_price,
        seller_price,
        seller_profit,

        cost_price,
        platform_margin,

        mrp
      )
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  /* =========================================================
     📍 ADDRESSES
  ========================================================= */

  const {
    data: addresses,
  } = await supabase
    .from("addresses")
    .select("*")
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  /* =========================================================
     ❌ ERROR
  ========================================================= */

  if (cartError) {

    console.error(
      "CART ERROR:",
      cartError
    );

    return (
      <div className="min-h-screen bg-zinc-50">

        <div className="max-w-3xl mx-auto px-4 py-16">

          <div className="bg-white border rounded-3xl p-8 shadow-sm">

            <h2 className="text-xl font-bold text-red-500">
              Cart unavailable
            </h2>

            <p className="text-sm text-zinc-600 mt-3">
              {
                cartError.message
              }
            </p>

            <p className="text-xs text-zinc-500 mt-4">
              Check Supabase table structure or RLS policies.
            </p>

          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     🧠 NORMALIZE CART
  ========================================================= */

  const safeCart =
    (cart || []).map(
      (item: any) => {

        const product =
          Array.isArray(
            item.products
          )
            ? item.products[0]
            : item.products;

        const variant =
          Array.isArray(
            item.product_variants
          )
            ? item
                .product_variants[0]
            : item.product_variants;

        return {
          ...item,

          products:
            product,

          product_variants:
            variant,

          variantImage:
            getVariantImage(
              product,
              variant
            ),
        };
      }
    );

  /* =========================================================
     💰 TOTALS
  ========================================================= */

  let subtotal = 0;

  let totalGst = 0;

  let totalItems = 0;

  safeCart.forEach(
    (item: any) => {

      const variant =
        item.product_variants;

      const product =
        item.products;

      const category =
        Array.isArray(
          product?.categories
        )
          ? product
              .categories[0]
          : product?.categories;

      const gstPercent =
        Number(
          category?.gst_percent ||
            18
        );

      const price =
        getPrice(
          variant
        );

      const quantity =
        Number(
          item.quantity ||
            1
        );

      const itemTotal =
        price *
        quantity;

      const gstAmount =
        Math.round(
          (
            (itemTotal *
              gstPercent) /
            100
          )
        );

      subtotal +=
        itemTotal;

      totalGst +=
        gstAmount;

      totalItems +=
        quantity;
    }
  );

  const shipping =
    0;

  const total =
    subtotal +
    totalGst +
    shipping;

  /* =========================================================
     🚀 UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-zinc-50">

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* =========================================================
           🔝 HEADER
        ========================================================= */}

        <div className="flex items-center justify-between mb-10">

          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-600 hover:text-black transition"
          >

            <ArrowLeft className="w-5 h-5" />

            <span className="font-medium">
              Continue Shopping
            </span>

          </Link>

          <div className="flex items-center gap-3">

            <ShoppingCart className="w-7 h-7" />

            <h1 className="text-3xl font-bold">
              Your Cart
            </h1>

          </div>

          <div />
        </div>

        {/* =========================================================
           🛒 EMPTY
        ========================================================= */}

        {safeCart.length ===
        0 ? (

          <EmptyCart />

        ) : (

          <div className="grid lg:grid-cols-12 gap-10">

            {/* =========================================================
               📦 LEFT
            ========================================================= */}

            <div className="lg:col-span-7 space-y-5">

              {safeCart.map(
                (
                  item: any
                ) => (

                  <CartItem
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                  />
                )
              )}

            </div>

            {/* =========================================================
               💰 RIGHT
            ========================================================= */}

            <div className="lg:col-span-5 space-y-6">

              {/* =========================================================
                 💰 SUMMARY
              ========================================================= */}

              <div className="bg-white border rounded-3xl p-6 shadow-sm">

                <h2 className="text-xl font-bold mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4">

                  <div className="flex items-center justify-between text-zinc-600">

                    <span>
                      Items (
                      {
                        totalItems
                      }
                      )
                    </span>

                    <span>
                      ₹
                      {subtotal.toFixed(
                        0
                      )}
                    </span>

                  </div>

                  <div className="flex items-center justify-between text-zinc-600">

                    <span>
                      GST / Taxes
                    </span>

                    <span>
                      ₹
                      {totalGst.toFixed(
                        0
                      )}
                    </span>

                  </div>

                  <div className="flex items-center justify-between text-zinc-600">

                    <span>
                      Shipping
                    </span>

                    <span className="text-green-600 font-semibold">
                      FREE
                    </span>

                  </div>
                </div>

                <hr className="my-5" />

                <div className="flex items-center justify-between">

                  <span className="text-lg font-bold">
                    Total
                  </span>

                  <span className="text-2xl font-bold">
                    ₹
                    {total.toFixed(
                      0
                    )}
                  </span>

                </div>

                {/* =========================================================
                   🔒 BADGES
                ========================================================= */}

                <div className="mt-6 space-y-3">

                  <div className="flex items-center gap-3 text-sm text-zinc-600">

                    <ShieldCheck className="w-4 h-4 text-green-600" />

                    <span>
                      100% Secure Payments
                    </span>

                  </div>

                  <div className="flex items-center gap-3 text-sm text-zinc-600">

                    <Truck className="w-4 h-4 text-blue-600" />

                    <span>
                      Fast Delivery Across India
                    </span>

                  </div>
                </div>
              </div>

              {/* =========================================================
                 📍 CHECKOUT
              ========================================================= */}

              <div className="bg-white border rounded-3xl p-6 shadow-sm">

                <h2 className="text-xl font-bold mb-5">
                  Shipping Details
                </h2>

                <CheckoutForm
                  user={
                    user
                  }
                  addresses={
                    addresses ||
                    []
                  }
                />

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   🛒 EMPTY CART
========================================================= */

function EmptyCart() {

  return (

    <div className="bg-white rounded-3xl border shadow-sm p-16 text-center">

      <div className="w-24 h-24 rounded-full bg-zinc-100 mx-auto flex items-center justify-center mb-6">

        <ShoppingCart className="w-10 h-10 text-zinc-500" />

      </div>

      <h2 className="text-2xl font-bold">
        Your cart is empty
      </h2>

      <p className="text-zinc-500 mt-3">
        Looks like you haven't added anything yet.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center mt-8 bg-black text-white px-8 py-3 rounded-2xl font-medium hover:bg-zinc-900 transition"
      >
        Start Shopping
      </Link>
    </div>
  );
}