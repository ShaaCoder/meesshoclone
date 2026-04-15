"use client";

import Image from "next/image";

export default function SellerProductCard({ product }: { product: any }) {

  const variants = product.product_variants || [];

  const prices = variants.map((v: any) => Number(v.price || 0));
  const costs = variants.map((v: any) => Number(v.cost_price || 0));

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const minCost = costs.length ? Math.min(...costs) : 0;

  const profit = minPrice - minCost;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-600 transition-all group">

      {/* IMAGE */}
      <div className="relative h-48">
        <Image
          src={product.image || "/placeholder.jpg"}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* DETAILS */}
      <div className="p-5">
        <h3 className="font-semibold text-lg line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-4 space-y-1 text-sm">
          <p className="text-zinc-400">
            Cost: <span className="text-white">₹{minCost}</span>
          </p>

          <p className="text-zinc-400">
            Selling: <span className="text-emerald-400 font-medium">₹{minPrice}</span>
          </p>

          <p className="text-emerald-500 font-medium">
            Profit: ₹{profit}
          </p>
        </div>

        <span
          className={`inline-block mt-4 px-4 py-1.5 text-xs font-medium rounded-full ${
            product.status === "approved"
              ? "bg-emerald-500/10 text-emerald-400"
              : product.status === "pending"
              ? "bg-amber-500/10 text-amber-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {product.status?.toUpperCase()}
        </span>
      </div>
    </div>
  );
}