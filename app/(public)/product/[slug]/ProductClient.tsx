"use client";

import { useState } from "react";
import Image from "next/image";
import VariantSelector from "@/components/VariantSelector";
import AddToCartButton from "./AddToCartButton";
import BuyNowButton from "@/components/BuyNowButton";
import WishlistButton from "@/components/WishlistButton";

export default function ProductClient({ product, isWishlisted }: any) {
  /* ============================= */
  /* ✅ VARIANT */
  /* ============================= */
  const hasVariants = product.product_variants?.length > 0;

  const [selectedVariant, setSelectedVariant] = useState(
    hasVariants ? product.product_variants[0] : null
  );

  /* ============================= */
  /* 🖼 IMAGES */
  /* ============================= */
  const images =
    product.product_images?.length > 0
      ? product.product_images.map((img: any) => img.url)
      : [product.image || "/placeholder.png"];

  const [selectedImage, setSelectedImage] = useState(images[0]);

  /* ============================= */
  /* 💰 PRICE */
  /* ============================= */
  const price = Number(
    selectedVariant?.price ||
      (selectedVariant?.cost_price || 0) +
        (selectedVariant?.platform_margin || 0) ||
      product?.product_variants?.[0]?.price ||
      0
  );

  const mrp = Number(
    selectedVariant?.mrp || Math.round(price * 1.3)
  );

  const discount =
    mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  /* ============================= */
  /* 📦 STOCK */
  /* ============================= */
  const stock =
    selectedVariant?.stock ??
    product?.product_variants?.[0]?.stock ??
    0;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

          {/* ================= IMAGE ================= */}
          <div className="space-y-4">

            <div className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-md">

              {/* ❤️ WISHLIST (FIXED) */}
              <div className="absolute top-4 right-4 z-10">
                <WishlistButton
                  productId={product.id}
                  initial={isWishlisted}
                />
              </div>

              {/* DISCOUNT */}
              {discount > 5 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow">
                  {discount}% OFF
                </div>
              )}

              <Image
                src={selectedImage}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>

            {/* THUMBNAILS */}
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  onClick={() => setSelectedImage(img)}
                  className={`h-20 w-20 object-cover rounded-lg cursor-pointer border-2 transition ${
                    selectedImage === img
                      ? "border-black scale-105"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>

            {/* TRUST BADGES */}
            <div className="flex gap-4 text-xs text-gray-500">
              <span>🚚 Free Delivery</span>
              <span>💵 COD Available</span>
              <span>🔁 Easy Returns</span>
            </div>
          </div>

          {/* ================= DETAILS ================= */}
          <div className="space-y-6">

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {product.name}
            </h1>

            {/* PRICE CARD */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-black">
                  ₹{price || "N/A"}
                </span>

                {mrp > price && (
                  <span className="text-lg text-gray-400 line-through">
                    ₹{mrp}
                  </span>
                )}
              </div>

              {discount > 0 && (
                <p className="text-green-600 text-sm font-semibold">
                  Save ₹{mrp - price} ({discount}% OFF)
                </p>
              )}
            </div>

            {/* STOCK */}
            {stock > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-sm px-4 py-2 rounded-xl w-fit">
                🔥 Only {stock} items left
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 text-sm px-4 py-2 rounded-xl w-fit text-red-600">
                Out of Stock
              </div>
            )}

            {/* DESCRIPTION */}
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* VARIANTS */}
            {hasVariants ? (
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <h3 className="font-semibold mb-3">Select Option</h3>
                <VariantSelector
                  variants={product.product_variants}
                  onSelect={setSelectedVariant}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No variants available
              </p>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-3 pt-2">
              <AddToCartButton
                productId={product.id}
                variantId={selectedVariant?.id}
                disabled={stock === 0 || (hasVariants && !selectedVariant)}
                className="w-full py-4 text-lg bg-black text-white rounded-xl hover:opacity-90 transition disabled:opacity-50"
              />

              <BuyNowButton
                productId={product.id}
                variantId={selectedVariant?.id}
                disabled={stock === 0 || (hasVariants && !selectedVariant)}
                className="w-full py-4 text-lg bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
              />
            </div>

          </div>
        </div>
      </div>

      {/* MOBILE BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-3 md:hidden shadow-lg">
        <button
          disabled={stock === 0 || (hasVariants && !selectedVariant)}
          className="flex-1 border rounded-xl py-3 disabled:opacity-50"
        >
          Add to Cart
        </button>
        <button
          disabled={stock === 0 || (hasVariants && !selectedVariant)}
          className="flex-1 bg-black text-white rounded-xl py-3 disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}