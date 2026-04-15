"use client";

import Link from "next/link";
import Image from "next/image";

export default function SimilarProducts({ products }: any) {
  if (!products?.length) return null;

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold mb-6">Similar Products</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {products.map((p: any) => {
          
          /* ============================= */
          /* 🧠 VARIANT PRICE LOGIC */
          /* ============================= */
          const variants = p.product_variants || [];

          const prices = variants
            .map((v: any) => {
              const cost = Number(v.cost_price || 0);
              const margin = Number(v.platform_margin || 0);
              return cost + margin;
            })
            .filter((n: number) => n > 0);

          const minPrice = prices.length ? Math.min(...prices) : 0;
          const maxPrice = prices.length ? Math.max(...prices) : 0;

          return (
            <Link key={p.id} href={`/product/${p.slug}`}>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition group cursor-pointer">
                
                {/* IMAGE */}
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={p.image || "/placeholder.png"}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>

                {/* DETAILS */}
                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2">
                    {p.name}
                  </h3>

                  {/* 🔥 PRICE RANGE */}
                  <p className="text-lg font-semibold mt-1">
                    {minPrice
                      ? maxPrice && maxPrice !== minPrice
                        ? `₹${minPrice} - ₹${maxPrice}`
                        : `₹${minPrice}`
                      : "No price"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}