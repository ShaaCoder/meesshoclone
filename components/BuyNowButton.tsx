"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";

type Props = {
  productId: string;
  variantId?: string; // ✅ must come from ProductClient
  className?: string;
  disabled?: boolean;
};

export default function BuyNowButton({
  productId,
  variantId,
  className,
  disabled,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleBuyNow = () => {
    // 🚨 IMPORTANT: block if no variant
    if (!variantId) {
      alert("Please select size / variant");
      return;
    }

    startTransition(async () => {
      try {
        // ✅ FIX: pass variantId
        await addToCart(productId, variantId);

        // ✅ redirect after adding
        router.push("/cart");
      } catch (error: any) {
        alert(error.message || "Something went wrong");
      }
    });
  };

  return (
    <button
      onClick={handleBuyNow}
      disabled={disabled || isPending} // ✅ FIX
      className={`w-full py-4 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-gray-900 transition disabled:opacity-70 ${
        className || ""
      }`}
    >
      {isPending ? "Processing..." : "Buy Now"}
    </button>
  );
}