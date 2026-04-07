"use client";

import { useSearchParams } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import Link from "next/link";
import Image from "next/image";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const products = useProducts();

  const filtered = products.filter((p: any) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      <h1 className="text-2xl font-bold mb-6">
        Search results for: <span className="text-blue-600">{query}</span>
      </h1>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No products found 😢</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filtered.map((p: any) => (
            <Link key={p.id} href={`/product/${p.slug}`}>
              <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-3">

                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={p.image || "/placeholder.png"}
                    alt={p.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <h3 className="text-sm mt-3 line-clamp-2">{p.name}</h3>
                <p className="font-semibold mt-1">₹{p.selling_price}</p>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}