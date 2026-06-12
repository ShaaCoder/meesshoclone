"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Variant = {
  id: string;

  size?: string;

  color?: string;

  selling_price?: number;

  stock?: number;

  reserved_stock?: number;

  image?: string;

  images?: any[];

  attributes?: {
    size?: string;
    color?: string;
  };
};

export default function VariantSelector({
  variants,
  onSelect,
}: {
  variants: Variant[];

  onSelect?: (
    variant: Variant | null
  ) => void;
}) {

  /* =========================================================
     🧹 CLEAN VARIANTS
  ========================================================= */

  const cleanVariants =
    useMemo(() => {

      return variants.map(
        (variant) => ({

          ...variant,

          size: String(
            variant.size ||
              variant.attributes
                ?.size ||
              ""
          )
            .trim()
            .toUpperCase(),

          color: String(
            variant.color ||
              variant.attributes
                ?.color ||
              ""
          )
            .trim()
            .toLowerCase(),

          stock: Number(
            variant.stock || 0
          ),

          reserved_stock:
            Number(
              variant.reserved_stock ||
                0
            ),

          selling_price:
            Number(
              variant.selling_price ||
                0
            ),
        })
      );

    }, [variants]);

  /* =========================================================
     📦 OPTIONS
  ========================================================= */

  const sizes =
    useMemo(() => {

      return [
        ...new Set(
          cleanVariants
            .map(
              (variant) =>
                variant.size
            )
            .filter(Boolean)
        ),
      ];

    }, [cleanVariants]);

  const colors =
    useMemo(() => {

      return [
        ...new Set(
          cleanVariants
            .map(
              (variant) =>
                variant.color
            )
            .filter(Boolean)
        ),
      ];

    }, [cleanVariants]);

  /* =========================================================
     🎯 STATE
  ========================================================= */

  const [size, setSize] =
    useState("");

  const [color, setColor] =
    useState("");

  /* =========================================================
     🚀 AUTO SELECT
  ========================================================= */

  useEffect(() => {

    if (
      sizes.length > 0 &&
      !size
    ) {

      setSize(
        sizes[0]
      );
    }

    if (
      colors.length > 0 &&
      !color
    ) {

      setColor(
        colors[0]
      );
    }

  }, [
    sizes,
    colors,
    size,
    color,
  ]);

  /* =========================================================
     🔍 FIND VARIANT
  ========================================================= */

  const selectedVariant =
    useMemo(() => {

      /* =========================================================
         🎯 MATCH SIZE + COLOR
      ========================================================= */

      if (
        size &&
        color
      ) {

        const found =
          cleanVariants.find(
            (variant) =>
              variant.size ===
                size &&
              variant.color ===
                color
          );

        if (found) {
          return found;
        }
      }

      /* =========================================================
         🎯 MATCH SIZE
      ========================================================= */

      if (size) {

        const found =
          cleanVariants.find(
            (variant) =>
              variant.size ===
              size
          );

        if (found) {
          return found;
        }
      }

      /* =========================================================
         🎯 MATCH COLOR
      ========================================================= */

      if (color) {

        const found =
          cleanVariants.find(
            (variant) =>
              variant.color ===
              color
          );

        if (found) {
          return found;
        }
      }

      /* =========================================================
         🔄 FALLBACK
      ========================================================= */

      return (
        cleanVariants[0] ||
        null
      );

    }, [
      size,
      color,
      cleanVariants,
    ]);

  /* =========================================================
     🚀 SEND SELECTED VARIANT
  ========================================================= */

  useEffect(() => {

    onSelect?.(
      selectedVariant
    );

  }, [
    selectedVariant,
    onSelect,
  ]);

  /* =========================================================
     🚫 EMPTY
  ========================================================= */

  if (
    !cleanVariants.length
  ) {

    return (
      <div className="text-sm text-red-500">

        No variants available

      </div>
    );
  }

  /* =========================================================
     🚀 UI
  ========================================================= */

  return (
    <div className="space-y-5">

      {/* =========================================================
         📏 SIZE
      ========================================================= */}

      {sizes.length > 0 && (

        <div>

          <p className="font-semibold mb-2">

            Size

          </p>

          <div className="flex flex-wrap gap-2">

            {sizes.map(
              (s) => (

                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSize(s)
                  }
                  className={`px-4 py-2 border rounded-xl transition ${
                    size === s
                      ? "bg-black text-white border-black"
                      : "border-zinc-300 bg-white"
                  }`}
                >

                  {s}

                </button>
              )
            )}

          </div>

        </div>
      )}

      {/* =========================================================
         🎨 COLOR
      ========================================================= */}

      {colors.length > 0 && (

        <div>

          <p className="font-semibold mb-2">

            Color

          </p>

          <div className="flex flex-wrap gap-3">

            {colors.map(
              (c) => {

                const active =
                  color === c;

                return (

                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setColor(c)
                    }
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl capitalize transition ${
                      active
                        ? "bg-black text-white border-black"
                        : "border-zinc-300 bg-white"
                    }`}
                  >

                    {/* 🎨 COLOR DOT */}

                    <span
                      className="w-4 h-4 rounded-full border border-white"
                      style={{
                        backgroundColor:
                          c,
                      }}
                    />

                    {c}

                  </button>
                );
              }
            )}

          </div>

        </div>
      )}

      {/* =========================================================
         📦 VARIANT INFO
      ========================================================= */}

      {selectedVariant && (

        <div className="border rounded-2xl p-4 bg-zinc-50">

          <div className="flex justify-between items-start gap-4">

            {/* PRICE */}

            <div>

              <p className="text-sm text-zinc-500">

                Price

              </p>

              <p className="font-bold text-lg">

                ₹
                {
                  selectedVariant
                    .selling_price
                }

              </p>

            </div>

            {/* STOCK */}

            <div className="text-right">

              <p className="text-sm text-zinc-500">

                Stock

              </p>

              <p
                className={
                  selectedVariant.stock >
                  0
                    ? "text-green-600 font-semibold"
                    : "text-red-500 font-semibold"
                }
              >

                {selectedVariant.stock >
                0
                  ? `${
                      selectedVariant.stock
                    } Available`
                  : "Out of Stock"}

              </p>

            </div>

          </div>

          {/* SELECTED DETAILS */}

          <div className="mt-4 flex flex-wrap gap-2">

            {selectedVariant.size && (

              <span className="text-xs bg-white border px-3 py-1 rounded-full">

                Size:
                {" "}
                {
                  selectedVariant.size
                }

              </span>
            )}

            {selectedVariant.color && (

              <span className="text-xs bg-white border px-3 py-1 rounded-full capitalize">

                Color:
                {" "}
                {
                  selectedVariant.color
                }

              </span>
            )}

          </div>

        </div>
      )}

    </div>
  );
}