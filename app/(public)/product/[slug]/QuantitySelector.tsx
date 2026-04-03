// app/products/[slug]/QuantitySelector.tsx
"use client";

import { useState } from "react";

export default function QuantitySelector() {
  const [quantity, setQuantity] = useState(1);

  const increment = () => setQuantity((prev) => prev + 1);
  const decrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div>
      <p className="font-medium mb-2">Quantity</p>
      <div className="flex items-center gap-4 w-fit border border-gray-300 rounded-xl px-4 py-2">
        <button
          onClick={decrement}
          className="text-3xl font-light text-gray-500 hover:text-black transition w-8 h-8 flex items-center justify-center"
        >
          −
        </button>

        <span className="w-10 text-center font-semibold text-xl">{quantity}</span>

        <button
          onClick={increment}
          className="text-3xl font-light text-gray-500 hover:text-black transition w-8 h-8 flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}