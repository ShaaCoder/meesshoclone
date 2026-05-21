"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import VariantSelector from "@/components/VariantSelector";
import AddToCartButton from "./AddToCartButton";
import BuyNowButton from "@/components/BuyNowButton";
import WishlistButton from "@/components/WishlistButton";

export default function ProductClient({
  product,
  isWishlisted,
}: any) {
  /* ============================= */
  /* 🛑 SAFETY */
  /* ============================= */

  if (!product) {
    return (
      <div className="p-10 text-center text-red-500">
        Product not available
      </div>
    );
  }

  /* ============================= */
  /* 📦 DATA */
  /* ============================= */

  const variants = product.product_variants || [];
  const hasVariants = variants.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  /* ============================= */
  /* 🖼 IMAGES */
  /* ============================= */

  const images =
    product.product_images?.map((i: any) => i?.url).filter(Boolean) || [];

  const safeImages =
    images.length > 0 ? images : ["/placeholder.svg"];

  const [selectedImage, setSelectedImage] = useState(
    safeImages[0]
  );

  /* ============================= */
  /* 💰 PRICE ENGINE (FINAL FIX) */
  /* ============================= */

  const getVariantPrice = (v: any) => {
    if (!v) return 0;

    return (
      Number(v.selling_price) || // ✅ primary
      Number(v.cost_price) || // fallback
      0
    );
  };

  // ✅ MIN PRICE (important)
  const minPrice = useMemo(() => {
    if (!variants.length) return 0;

    const prices = variants
      .map(getVariantPrice)
      .filter((p) => p > 0);

    return prices.length ? Math.min(...prices) : 0;
  }, [variants]);

  // ✅ CURRENT PRICE
  const price = selectedVariant
    ? getVariantPrice(selectedVariant)
    : minPrice;

  /* ============================= */
  /* 💰 MRP & DISCOUNT */
  /* ============================= */

  const mrp =
    selectedVariant?.mrp && selectedVariant.mrp > price
      ? Number(selectedVariant.mrp)
      : price > 0
      ? Math.round(price * 1.2)
      : 0;

  const discount =
    mrp > price
      ? Math.round(((mrp - price) / mrp) * 100)
      : 0;

  const stock = selectedVariant?.stock ?? 0;

  /* ============================= */
  /* 🚀 UI */
  /* ============================= */

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">

        {/* IMAGE */}
        <div>
          <div className="relative aspect-square bg-white rounded-2xl overflow-hidden">

            <div className="absolute top-3 right-3 z-10">
              <WishlistButton
                productId={product.id}
                initial={isWishlisted}
              />
            </div>

            <Image
              src={selectedImage}
              alt={product.name}
              fill
              className="object-cover"
              onError={() => setSelectedImage("/placeholder.svg")}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* THUMBNAILS */}
          <div className="flex gap-2 mt-3">
            {safeImages.map((img: string, i: number) => (
              <Image
                key={i}
                src={img}
                alt="thumb"
                width={64}
                height={64}
                onClick={() => setSelectedImage(img)}
                className={`rounded cursor-pointer border ${
                  selectedImage === img
                    ? "border-black"
                    : "border-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* DETAILS */}
        <div className="space-y-4">

          <h1 className="text-2xl font-bold">
            {product.name}
          </h1>

          {/* 💰 PRICE */}
          <div>
            <span className="text-2xl font-bold">
              {price > 0 ? `₹${price}` : "Price unavailable"}
            </span>

            {mrp > price && (
              <span className="ml-2 line-through text-gray-400">
                ₹{mrp}
              </span>
            )}
          </div>

          {/* 👇 STARTING PRICE LABEL */}
          {!selectedVariant && variants.length > 1 && (
            <p className="text-sm text-gray-500">
              Starting from ₹{minPrice}
            </p>
          )}

          {/* DISCOUNT */}
          {discount > 0 && (
            <p className="text-green-600 text-sm">
              {discount}% OFF
            </p>
          )}

          {/* STOCK */}
          {selectedVariant ? (
            stock > 0 ? (
              <p className="text-green-600 text-sm">
                In Stock ({stock})
              </p>
            ) : (
              <p className="text-red-500 text-sm">
                Out of Stock
              </p>
            )
          ) : (
            <p className="text-gray-500 text-sm">
              Select variant to check stock
            </p>
          )}

          {/* DESCRIPTION */}
          <p className="text-gray-600">
            {product.description}
          </p>

          {/* VARIANTS */}
          {hasVariants && (
            <VariantSelector
              variants={variants}
              onSelect={(variant: any) =>
                setSelectedVariant(variant)
              }
            />
          )}

          {/* ACTIONS */}
          <div className="flex gap-3 pt-4">
            <AddToCartButton
              productId={product.id}
              variantId={selectedVariant?.id}
              disabled={!selectedVariant || stock <= 0}
            />

            <BuyNowButton
              productId={product.id}
              variantId={selectedVariant?.id}
              disabled={!selectedVariant || stock <= 0}
            />
          </div>

        </div>
      </div>
    </div>
  );
}