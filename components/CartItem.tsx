"use client";

import {
  useTransition,
  useState,
} from "react";

import {
  updateCartQuantity,
  removeFromCart,
} from "@/app/actions/cart";

import Image from "next/image";

import { useRouter } from "next/navigation";

/* =========================================================
   🧠 PRICE UTIL
========================================================= */

function getPrice(
  variant: any
) {

  if (!variant) {
    return 0;
  }

  if (
    Number(
      variant.selling_price
    ) > 0
  ) {

    return Number(
      variant.selling_price
    );
  }

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
  /* 🎨 VARIANT COLOR */
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
  /* 🎨 MATCH IMAGE */
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

export default function CartItem({
  item,
}: {
  item: any;
}) {

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [error, setError] =
    useState("");

  const router =
    useRouter();

  /* =========================================================
     🧠 NORMALIZE
  ========================================================= */

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

  /* =========================================================
     🖼 IMAGE
  ========================================================= */

  const productImageUrl =
    getVariantImage(
      product,
      variant
    );

  /* =========================================================
     💰 PRICE
  ========================================================= */

  const price =
    getPrice(
      variant
    );

  const total =
    item.quantity *
    price;

  /* =========================================================
     🔄 QUANTITY
  ========================================================= */

  const updateQty = (
    qty: number
  ) => {

    if (qty < 1) {
      return;
    }

    setError("");

    startTransition(
      async () => {

        try {

          await updateCartQuantity(
            item.id,
            qty
          );

          router.refresh();

        } catch (
          err: any
        ) {

          setError(
            err.message ||
              "Update failed"
          );
        }
      }
    );
  };

  /* =========================================================
     ❌ REMOVE
  ========================================================= */

  const removeItem =
    () => {

      if (
        !confirm(
          "Remove item?"
        )
      ) {
        return;
      }

      startTransition(
        async () => {

          await removeFromCart(
            item.id
          );

          router.refresh();
        }
      );
    };

  /* =========================================================
     🎨 VARIANT DETAILS
  ========================================================= */

  const variantSize =
    variant?.size ||
    variant?.attributes
      ?.size;

  const variantColor =
    variant?.color ||
    variant?.attributes
      ?.color;

  return (

    <div className="flex gap-6 bg-white p-5 rounded-xl shadow border relative">

      {/* =========================================================
         🖼 IMAGE
      ========================================================= */}

      <div className="w-28 h-28 relative rounded-lg overflow-hidden shrink-0">

        <Image
          src={
            productImageUrl
          }
          alt={
            product?.name ||
            "Product"
          }
          fill
          className="object-cover"
          sizes="112px"
        />

      </div>

      {/* =========================================================
         📦 INFO
      ========================================================= */}

      <div className="flex-1">

        <h3 className="font-semibold text-lg leading-6">

          {
            product?.name
          }

        </h3>

        {/* =========================================================
           🎨 VARIANT
        ========================================================= */}

        <div className="flex flex-wrap gap-2 mt-3">

          {variantSize && (

            <span className="text-xs border rounded-full px-3 py-1 bg-zinc-50">

              Size:
              {" "}
              {
                variantSize
              }

            </span>
          )}

          {variantColor && (

            <span className="text-xs border rounded-full px-3 py-1 bg-zinc-50 capitalize">

              Color:
              {" "}
              {
                variantColor
              }

            </span>
          )}

        </div>

        {/* =========================================================
           💰 PRICE
        ========================================================= */}

        <p className="text-xl font-bold mt-4">

          ₹
          {price}

        </p>

      </div>

      {/* =========================================================
         🔄 QUANTITY
      ========================================================= */}

      <div className="flex flex-col items-center gap-3">

        <div className="flex items-center border rounded-lg overflow-hidden">

          <button
            onClick={() =>
              updateQty(
                item.quantity -
                  1
              )
            }
            disabled={
              isPending
            }
            className="px-4 py-2"
          >

            −

          </button>

          <span className="px-5 font-semibold">

            {
              item.quantity
            }

          </span>

          <button
            onClick={() =>
              updateQty(
                item.quantity +
                  1
              )
            }
            disabled={
              isPending
            }
            className="px-4 py-2"
          >

            +

          </button>

        </div>

        {error && (

          <p className="text-red-500 text-xs">

            {error}

          </p>
        )}

      </div>

      {/* =========================================================
         💰 TOTAL
      ========================================================= */}

      <div className="font-bold text-lg self-center">

        ₹
        {total}

      </div>

      {/* =========================================================
         ❌ REMOVE
      ========================================================= */}

      <button
        onClick={
          removeItem
        }
        className="absolute top-3 right-3 text-red-500 text-xl"
      >

        ✕

      </button>

    </div>
  );
}