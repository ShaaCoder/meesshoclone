"use client";

import Link from "next/link";

export default function ProductCard({ product }: any) {
  /* ================= PRICE LOGIC ================= */
  const variants = product.product_variants || [];

  const prices = variants
    .map((v: any) => Number(v.price || 0))
    .filter((n: number) => n > 0);

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden cursor-pointer">

        {/* IMAGE */}
        <img
          src={product.image || "/placeholder.png"}
          className="w-full h-48 object-cover"
          alt={product.name}
        />

        {/* DETAILS */}
        <div className="p-3">
          <h2 className="font-semibold text-sm line-clamp-2">
            {product.name}
          </h2>

          {/* 🔥 PRICE */}
          <p className="text-lg font-bold mt-1">
            {minPrice
              ? maxPrice !== minPrice
                ? `₹${minPrice} - ₹${maxPrice}`
                : `₹${minPrice}`
              : "No price"}
          </p>
        </div>
      </div>
    </Link>
  );
}