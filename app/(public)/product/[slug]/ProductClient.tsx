"use client";

import { useState } from "react";
import Image from "next/image";
import VariantSelector from "@/components/VariantSelector";
import AddToCartButton from "./AddToCartButton";
import BuyNowButton from "@/components/BuyNowButton";

export default function ProductClient({ product }: any) {
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  /* 🔥 MULTIPLE IMAGES */
  const images =
    product.product_images?.length > 0
      ? product.product_images.map((img: any) => img.url)
      : [product.image || "/placeholder.png"];

  const [selectedImage, setSelectedImage] = useState(images[0]);

  const basePrice = Number(product.base_price || 0);
  const price =
    selectedVariant?.price ||
    Number(product.selling_price) ||
    basePrice;

  const mrp = Math.round(price * 1.3);
  const discount = Math.round(((mrp - price) / mrp) * 100);

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

          {/* ================= IMAGE ================= */}
          <div className="space-y-4">

            {/* 🔥 MAIN IMAGE */}
            <div className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-sm">
              <Image
                src={selectedImage}
                alt={product.name}
                fill
                className="object-cover"
              />

              {discount > 5 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm px-3 py-1 rounded-xl shadow">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* 🔥 THUMBNAILS */}
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  onClick={() => setSelectedImage(img)}
                  className={`h-20 w-20 object-cover rounded cursor-pointer border-2 transition ${
                    selectedImage === img
                      ? "border-black"
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

            <div className="flex items-center gap-2 text-sm">
              <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">
                4.4 ★
              </span>
              <span className="text-gray-500">(1,245 reviews)</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-black">
                  ₹{price}
                </span>

                <span className="text-lg text-gray-400 line-through">
                  ₹{mrp}
                </span>
              </div>

              <p className="text-green-600 text-sm font-semibold">
                Save ₹{mrp - price} ({discount}% OFF)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 text-sm px-4 py-2 rounded-xl w-fit">
              🔥 Only few items left in stock!
            </div>

            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* MANUFACTURER */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold mb-3">Manufacturer Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Manufacturer</span>
                  <span>{product.manufacturer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Address</span>
                  <span>{product.manufacturer_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pincode</span>
                  <span>{product.manufacturer_pincode}</span>
                </div>
              </div>
            </div>

            {/* PRODUCT INFO */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold mb-3">Product Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Country</span>
                  <span>{product.country_of_origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST</span>
                  <span>{product.gst_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">HSN Code</span>
                  <span>{product.hsn_code}</span>
                </div>
              </div>
            </div>

            {/* VARIANTS */}
            {product.product_variants?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Select Option</h3>
                <VariantSelector
                  variants={product.product_variants}
                  onSelect={setSelectedVariant}
                />
              </div>
            )}

            {/* ATTRIBUTES */}
            {product.product_attributes?.length > 0 && (
              <div className="bg-white border rounded-2xl p-4">
                <h3 className="font-semibold mb-3">Product Details</h3>
                <div className="space-y-2 text-sm">
                  {product.product_attributes.map((attr: any) => (
                    <div key={attr.attributes.name} className="flex justify-between">
                      <span className="text-gray-500">
                        {attr.attributes.name}
                      </span>
                      <span>{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-3 pt-4">

              <AddToCartButton
                productId={product.id}
                variantId={selectedVariant?.id}
                className="w-full py-4 text-lg bg-black text-white rounded-xl"
              />

              <BuyNowButton
                productId={product.id}
                className="w-full py-4 text-lg bg-yellow-400 text-black rounded-xl font-semibold"
              />

            </div>

          </div>
        </div>
      </div>

      {/* MOBILE BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-3 md:hidden z-50">
        <button className="flex-1 border rounded-xl py-3">
          Add to Cart
        </button>
        <button className="flex-1 bg-black text-white rounded-xl py-3">
          Buy Now
        </button>
      </div>
    </div>
  );
}