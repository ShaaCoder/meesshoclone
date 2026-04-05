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
          const price = Number(p.selling_price || p.base_price || 0);

          return (
            <Link key={p.id} href={`/product/${p.slug}`}>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition group cursor-pointer">
                
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={p.image || "/placeholder.png"}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2">
                    {p.name}
                  </h3>

                  <p className="text-lg font-semibold mt-1">
                    ₹{price}
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