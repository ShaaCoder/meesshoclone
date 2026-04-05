// app/products/[slug]/BuyNowButton.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";

type Props = {
  productId: string;
  className?: string; // ✅ optional styling
};

export default function BuyNowButton({ productId, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleBuyNow = () => {
    startTransition(async () => {
      try {
        await addToCart(productId);
        router.push("/cart"); // redirect to cart
      } catch (error: any) {
        alert(error.message || "Something went wrong");
      }
    });
  };

  return (
    <button
      onClick={handleBuyNow}
      disabled={isPending}
      className={`w-full py-4 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-gray-900 transition disabled:opacity-70 ${className || ""}`}
    >
      {isPending ? "Processing..." : "Buy Now"}
    </button>
  );
}