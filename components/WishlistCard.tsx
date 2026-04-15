"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import {
  removeFromWishlist,
  moveToCart,
} from "@/app/actions/wishlist";
import { useRouter } from "next/navigation";

export default function WishlistCard({ product }: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRemove = () => {
    startTransition(async () => {
      await removeFromWishlist(product.id);
      router.refresh(); // 🔥 refresh UI
    });
  };

  const handleMoveToCart = () => {
    startTransition(async () => {
      await moveToCart(product.id);
      router.refresh();
    });
  };

  const image =
    product.product_images?.[0]?.url ||
    product.image ||
    "/placeholder.png";

  const variants = product.product_variants || [];

  const prices = variants
    .map((v: any) => {
      const cost = Number(v.cost_price || 0);
      const margin = Number(v.platform_margin || 0);
      return cost + margin;
    })
    .filter((n: number) => n > 0);

  const minPrice = prices.length ? Math.min(...prices) : 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition group">

      {/* IMAGE */}
      <div className="relative aspect-square bg-gray-100">

        {/* REMOVE ❤️ */}
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="absolute top-3 right-3 z-10 bg-white p-2 rounded-full shadow hover:scale-110 transition"
        >
          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
        </button>

        <Link href={`/product/${product.slug}`}>
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition"
          />
        </Link>
      </div>

      {/* DETAILS */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-medium line-clamp-2">
          {product.name}
        </h3>

        <p className="text-lg font-semibold">
          ₹{minPrice || "N/A"}
        </p>

        {/* MOVE TO CART */}
        <button
          onClick={handleMoveToCart}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-black text-white py-2 rounded-xl text-sm hover:opacity-90 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          Move to Cart
        </button>
      </div>
    </div>
  );
}