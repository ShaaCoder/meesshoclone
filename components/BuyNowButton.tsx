// app/products/[slug]/BuyNowButton.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";

export default function BuyNowButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleBuyNow = () => {
    startTransition(async () => {
      try {
        await addToCart(productId);
        router.push("/cart");        // Redirect to cart
      } catch (error: any) {
        alert(error.message || "Something went wrong");
      }
    });
  };

  return (
    <button
      onClick={handleBuyNow}
      disabled={isPending}
      className="w-full py-4 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-gray-900 transition disabled:opacity-70"
    >
      {isPending ? "Processing..." : "Buy Now"}
    </button>
  );
}