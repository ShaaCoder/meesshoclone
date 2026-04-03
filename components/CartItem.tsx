// components/CartItem.tsx
"use client";

import { useTransition, useState } from "react";
import { updateCartQuantity, removeFromCart } from "@/app/actions/cart";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CartItem({ item }: { item: any }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const product = item.products;
  const sellingPrice = Number(product.selling_price) || Number(product.base_price);
  const itemTotal = item.quantity * sellingPrice;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    
    setError("");
    startTransition(async () => {
      try {
        await updateCartQuantity(item.id, newQty);
        router.refresh();           // ← This is the key fix!
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to update");
      }
    });
  };

  const handleRemove = () => {
    if (!confirm("Remove this item?")) return;

    startTransition(async () => {
      try {
        await removeFromCart(item.id);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Failed to remove");
      }
    });
  };

  return (
    <div className="flex gap-6 bg-white p-5 rounded-xl shadow border relative">
      {/* Image */}
      <div className="w-28 h-28 relative rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="font-semibold text-xl">{product.name}</h3>
        <p className="text-2xl font-bold mt-2">₹{sellingPrice}</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center border-2 border-gray-300 rounded-lg">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isPending || item.quantity <= 1}
            className="px-4 py-3 text-2xl hover:bg-gray-100 disabled:opacity-50"
          >
            −
          </button>

          <span className="px-6 py-3 font-bold text-xl border-x-2">
            {item.quantity}
          </span>

          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isPending}
            className="px-4 py-3 text-2xl hover:bg-gray-100 disabled:opacity-50"
          >
            +
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* Item Total */}
      <div className="font-bold text-2xl self-center min-w-[100px] text-right">
        ₹{itemTotal}
      </div>

      <button
        onClick={handleRemove}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
      >
        ✕
      </button>
    </div>
  );
}