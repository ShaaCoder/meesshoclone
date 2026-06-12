"use client";

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";

import Image from "next/image";

import VariantSelector from "@/components/VariantSelector";

import AddToCartButton from "./AddToCartButton";

import BuyNowButton from "@/components/BuyNowButton";

import WishlistButton from "@/components/WishlistButton";

export default function ProductClient({
  product,
  isWishlisted,
}: any) {

  /* =========================================================
     🛑 SAFETY
  ========================================================= */

  if (!product) {
    return (
      <div className="p-10 text-center text-red-500">
        Product not available
      </div>
    );
  }

  /* =========================================================
     📦 VARIANTS
  ========================================================= */

  const variants =
    product.product_variants || [];

  const hasVariants =
    variants.length > 0;

  /* =========================================================
     🎯 DEFAULT VARIANT
  ========================================================= */

  const defaultVariant =
    variants.find(
      (variant: any) =>
        Number(
          variant.stock || 0
        ) -
          Number(
            variant.reserved_stock ||
              0
          ) >
        0
    ) ||
    variants[0] ||
    null;

  const [
    selectedVariant,
    setSelectedVariant,
  ] = useState<any>(
    defaultVariant
  );

  /* =========================================================
     🎨 GET VARIANT COLOR
  ========================================================= */

  const selectedColor =
    selectedVariant?.color
      ? String(
          selectedVariant.color
        ).toLowerCase()
      : selectedVariant
          ?.attributes?.color
      ? String(
          selectedVariant
            .attributes.color
        ).toLowerCase()
      : null;

  /* =========================================================
     🖼 ALL IMAGES
  ========================================================= */

  const allImages =
    Array.isArray(
      product.product_images
    )
      ? product.product_images
      : [];

  /* =========================================================
     🎨 FILTER IMAGES BY COLOR
  ========================================================= */

  const variantImages =
    useMemo(() => {

      /* 🚫 NO COLOR */
      if (!selectedColor) {

        return allImages;
      }

      /* 🎨 MATCH COLOR */
      const matched =
        allImages.filter(
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
              selectedColor
            );
          }
        );

      /* ✅ COLOR IMAGES FOUND */
      if (
        matched.length > 0
      ) {

        return matched;
      }

      /* 🔄 FALLBACK */
      return allImages;

    }, [
      allImages,
      selectedColor,
    ]);

  /* =========================================================
     🖼 SAFE IMAGE URLS
  ========================================================= */

  const safeImages =
    variantImages.length > 0
      ? variantImages
          .map(
            (img: any) =>
              img?.url
          )
          .filter(Boolean)
      : [
          "/placeholder.svg",
        ];

  /* =========================================================
     🖼 SELECTED IMAGE
  ========================================================= */

  const [
    selectedImage,
    setSelectedImage,
  ] = useState<string>(
    safeImages?.[0] ||
      "/placeholder.svg"
  );

  /* =========================================================
     🔄 CHANGE IMAGE ON COLOR CHANGE
  ========================================================= */

 /* =========================================================
   🔄 CHANGE IMAGE ON COLOR CHANGE
========================================================= */

useEffect(() => {

  if (
    safeImages.length > 0
  ) {

    setSelectedImage(
      safeImages[0]
    );
  }

}, [selectedColor]);

  /* =========================================================
     💰 PRICE HELPERS
  ========================================================= */

  const getVariantPrice = (
    variant: any
  ) => {

    if (!variant) {
      return 0;
    }

    return Number(
      variant.selling_price ||
        variant.price ||
        0
    );
  };

  /* =========================================================
     💰 PRICE RANGE
  ========================================================= */

  const minPrice =
    useMemo(() => {

      const prices =
        variants
          .map(
            getVariantPrice
          )
          .filter(
            (
              price: number
            ) => price > 0
          );

      return prices.length
        ? Math.min(
            ...prices
          )
        : 0;

    }, [variants]);

  const maxPrice =
    useMemo(() => {

      const prices =
        variants
          .map(
            getVariantPrice
          )
          .filter(
            (
              price: number
            ) => price > 0
          );

      return prices.length
        ? Math.max(
            ...prices
          )
        : 0;

    }, [variants]);

  /* =========================================================
     💰 CURRENT PRICE
  ========================================================= */

  const currentPrice =
    selectedVariant
      ? getVariantPrice(
          selectedVariant
        )
      : minPrice;

  /* =========================================================
     💰 MRP
  ========================================================= */

  const mrp = Number(
    selectedVariant?.mrp ||
      currentPrice * 1.2
  );

  const discount =
    mrp > currentPrice
      ? Math.round(
          (
            (mrp -
              currentPrice) /
            mrp
          ) *
            100
        )
      : 0;

  /* =========================================================
     📦 STOCK
  ========================================================= */

  const stock =
    Number(
      selectedVariant?.stock ||
        0
    ) -
    Number(
      selectedVariant?.reserved_stock ||
        0
    );

  const inStock =
    stock > 0;

  /* =========================================================
     🎯 VARIANT SELECT
  ========================================================= */

  const handleVariantSelect =
    useCallback(
      (variant: any) => {

        setSelectedVariant(
          variant
        );

        /* 🔥 FORCE FIRST IMAGE */
        const color =
          variant?.color
            ? String(
                variant.color
              ).toLowerCase()
            : variant
                ?.attributes
                ?.color
            ? String(
                variant
                  .attributes
                  .color
              ).toLowerCase()
            : null;

        if (!color) {
          return;
        }

        const matched =
          allImages.filter(
            (img: any) =>
              String(
                img?.color || ""
              ).toLowerCase() ===
              color
          );

        if (
          matched.length > 0
        ) {

          setSelectedImage(
            matched[0].url
          );
        }

      },
      [allImages]
    );

  /* =========================================================
     🚀 UI
  ========================================================= */

  return (
    <div className="bg-zinc-50 min-h-screen pb-24">

      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-10">

        {/* =========================================================
           🖼 LEFT
        ========================================================= */}

        <div>

          <div className="relative aspect-square bg-white rounded-3xl overflow-hidden border">

            <div className="absolute top-4 right-4 z-20">

              <WishlistButton
                productId={
                  product.id
                }
                initial={
                  isWishlisted
                }
              />

            </div>

            <Image
              src={
                selectedImage
              }
              alt={
                product.name
              }
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={() =>
                setSelectedImage(
                  "/placeholder.svg"
                )
              }
            />

          </div>

          {/* =========================================================
             🖼 THUMBNAILS
          ========================================================= */}

          <div className="flex gap-3 mt-4 overflow-x-auto">

            {safeImages.map(
              (
                image: string,
                index: number
              ) => (

                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    setSelectedImage(
                      image
                    )
                  }
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition shrink-0 ${
                    selectedImage ===
                    image
                      ? "border-black"
                      : "border-zinc-200"
                  }`}
                >

                  <Image
                    src={image}
                    alt={`Thumbnail ${
                      index + 1
                    }`}
                    fill
                    className="object-cover"
                  />

                </button>
              )
            )}

          </div>
        </div>

        {/* =========================================================
           📦 RIGHT
        ========================================================= */}

        <div className="space-y-6">

          {/* =========================================================
             🏷 TITLE
          ========================================================= */}

          <div>

            <h1 className="text-3xl font-bold text-zinc-900 leading-tight">

              {product.name}

            </h1>

            {variants.length >
              1 && (

              <p className="text-sm text-zinc-500 mt-2">

                Price Range:
                {" "}
                ₹{minPrice}
                {" - "}
                ₹{maxPrice}

              </p>
            )}

          </div>

          {/* =========================================================
             💰 PRICE
          ========================================================= */}

          <div className="space-y-2">

            <div className="flex items-center gap-3 flex-wrap">

              <span className="text-4xl font-bold text-zinc-900">

                ₹
                {currentPrice.toFixed(
                  0
                )}

              </span>

              {mrp >
                currentPrice && (

                <span className="text-xl text-zinc-400 line-through">

                  ₹
                  {mrp.toFixed(
                    0
                  )}

                </span>
              )}

              {discount >
                0 && (

                <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">

                  {discount}% OFF

                </span>
              )}

            </div>

            <p className="text-sm text-zinc-500">

              Inclusive of all taxes

            </p>

          </div>

          {/* =========================================================
             📦 STOCK
          ========================================================= */}

          <div>

            {inStock ? (

              <p className="text-green-600 font-medium">

                In Stock (
                {stock}
                {" "}
                left)

              </p>

            ) : (

              <p className="text-red-500 font-medium">

                Out of Stock

              </p>
            )}

          </div>

          {/* =========================================================
             🎨 SELECTED COLOR
          ========================================================= */}

          {selectedVariant?.color && (

            <div className="text-sm text-zinc-600">

              Selected Color:
              {" "}
              <span className="font-semibold text-zinc-900">
                {
                  selectedVariant.color
                }
              </span>

            </div>
          )}

          {/* =========================================================
             📝 DESCRIPTION
          ========================================================= */}

          {product.description && (

            <div className="bg-white rounded-3xl border p-5">

              <h3 className="font-semibold text-lg mb-3">

                Description

              </h3>

              <p className="text-zinc-600 leading-7 whitespace-pre-line">

                {
                  product.description
                }

              </p>

            </div>
          )}

          {/* =========================================================
             🎨 VARIANTS
          ========================================================= */}

          {hasVariants && (

            <div className="bg-white rounded-3xl border p-5">

              <h3 className="font-semibold text-lg mb-4">

                Select Variant

              </h3>

              <VariantSelector
                variants={
                  variants
                }
                onSelect={
                  handleVariantSelect
                }
              />

            </div>
          )}

          {/* =========================================================
             🛒 ACTIONS
          ========================================================= */}

          <div className="flex gap-4 pt-2">

            <AddToCartButton
              productId={
                product.id
              }
              variantId={
                selectedVariant?.id
              }
              disabled={
                !selectedVariant ||
                !inStock
              }
            />

            <BuyNowButton
              productId={
                product.id
              }
              variantId={
                selectedVariant?.id
              }
              disabled={
                !selectedVariant ||
                !inStock
              }
            />

          </div>

        </div>
      </div>
    </div>
  );
}