"use client";

import { useProducts } from "@/hooks/useProducts";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import ProductSkeleton from "@/components/ProductSkeleton";

export default function Home() {
  const products = useProducts();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (products) {
      setLoading(false);
    }
  }, [products]);

  if (loading) {
    return <ProductSkeleton />;
  }

  return (
    <div className="p-4 pb-20">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        
        {products.map((p: any) => {
          const basePrice = Number(p.base_price || 0);
          const sellingPrice =
            Number(p.selling_price) || basePrice;

          /* ============================= */
          /* 💰 MRP + DISCOUNT (CORRECT) */
          /* ============================= */
          const mrp = Math.round(sellingPrice * 1.3);
          const discount = Math.round(
            ((mrp - sellingPrice) / mrp) * 100
          );

          return (
            <Link
              href={`/product/${p.slug}`}
              key={p.id}
              className="group block"
            >
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]">

                {/* IMAGE */}
                <div className="relative aspect-[4/4] overflow-hidden bg-gray-100">
                  <Image
                    src={p.image || "/placeholder.png"}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* 🔥 DISCOUNT BADGE */}
                  {discount > 5 && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow">
                      {discount}% OFF
                    </div>
                  )}

                  {/* ❤️ WISHLIST */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      alert("❤️ Added to wishlist");
                    }}
                    className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-all"
                  >
                    ♡
                  </button>
                </div>

                {/* DETAILS */}
                <div className="p-3">
                  <h2 className="font-medium text-sm line-clamp-2 min-h-[42px] text-gray-800 group-hover:text-pink-600 transition-colors">
                    {p.name}
                  </h2>

                  {/* 💰 PRICE */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      ₹{sellingPrice}
                    </span>

                    {/* 🏷 MRP */}
                    {mrp > sellingPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ₹{mrp}
                      </span>
                    )}
                  </div>

                  {/* 💸 DISCOUNT TEXT */}
                  {discount > 5 && (
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      {discount}% OFF
                    </p>
                  )}

                  {/* EXTRA */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                    <div>⭐ 4.4</div>
                    <div>Free Shipping</div>
                  </div>
                </div>

              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}