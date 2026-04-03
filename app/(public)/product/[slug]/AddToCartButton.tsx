"use client";

import { useTransition } from "react";
import { addToCart } from "@/app/actions/cart";

export default function AddToCartButton({
  productId,
  variantId,
  className,
}: {
  productId: string;
  variantId?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    startTransition(async () => {
      await addToCart(productId, variantId);
    });
  };

  return (
    <button
      onClick={handleAdd}
      disabled={isPending}
      className={`bg-black text-white rounded-2xl ${className}`}
    >
      {isPending ? "Adding..." : "Add to Cart"}
    </button>
  );
}