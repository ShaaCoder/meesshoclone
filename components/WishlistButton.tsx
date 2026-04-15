"use client";

import { useTransition, useState } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/wishlist";

export default function WishlistButton({ productId, initial }: any) {
  const [isWishlisted, setIsWishlisted] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const res = await toggleWishlist(productId);

      if (res?.success) {
        setIsWishlisted(res.action === "added");
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`
        w-11 h-11 flex items-center justify-center
        rounded-full bg-white shadow-md border
        transition-all duration-300
        hover:scale-110 active:scale-95
      `}
    >
      <Heart
        className={`
          w-5 h-5 transition-all duration-300
          ${
            isWishlisted
              ? "fill-red-500 text-red-500 scale-110"
              : "text-gray-600"
          }
        `}
      />
    </button>
  );
}