"use client";

import { addToCart } from "@/app/actions/cart";
import { useTransition } from "react";

type Props = {
  productId: string;
  variantId?: string;
  className?: string;
  disabled?: boolean; // ✅ ADD THIS
};

export default function AddToCartButton({
  productId,
  variantId,
  className,
  disabled,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!variantId) {
      alert("Please select variant");
      return;
    }

    startTransition(async () => {
      await addToCart(productId, variantId);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isPending} // ✅ USE HERE
      className={className}
    >
      {isPending ? "Adding..." : "Add to Cart"}
    </button>
  );
}