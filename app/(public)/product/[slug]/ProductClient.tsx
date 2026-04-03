"use client";

import { useState } from "react";
import Image from "next/image";
import VariantSelector from "@/components/VariantSelector";
import AddToCartButton from "./AddToCartButton";
import BuyNowButton from "@/components/BuyNowButton";

export default function ProductClient({ product }: any) {
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const basePrice = Number(product.base_price || 0);

  const dynamicPrice =
    selectedVariant?.price ||
    Number(product.selling_price) ||
    basePrice;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

        {/* IMAGE */}
        <div>
          <div className="relative aspect-square bg-gray-100 rounded-3xl overflow-hidden">
            <Image
              src={product.image || "/placeholder.png"}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* DETAILS */}
        <div className="space-y-6">

          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* 🔥 DYNAMIC PRICE */}
          <div className="text-4xl font-bold">
            ₹{dynamicPrice}
          </div>

          <p className="text-gray-600">{product.description}</p>

          {/* 🔥 VARIANT SELECTOR */}
          {product.product_variants?.length > 0 && (
            <VariantSelector
              variants={product.product_variants}
              onSelect={setSelectedVariant}
            />
          )}

          {/* 🔥 ATTRIBUTES */}
          {product.product_attributes?.length > 0 && (
            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-2">Details</h3>

              {product.product_attributes.map((attr: any) => (
                <p key={attr.attributes.name}>
                  <b>{attr.attributes.name}:</b> {attr.value}
                </p>
              ))}
            </div>
          )}

          {/* 🔥 ACTIONS */}
          <div className="flex flex-col gap-4 pt-4">

            <AddToCartButton
              productId={product.id}
              variantId={selectedVariant?.id}
              className="w-full py-4"
            />

            <BuyNowButton productId={product.id} />

          </div>

        </div>
      </div>
    </div>
  );
}