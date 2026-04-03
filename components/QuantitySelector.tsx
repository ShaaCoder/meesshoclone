"use client";

import { useState } from "react";

export default function QuantitySelector() {
  const [quantity, setQuantity] = useState(1);

  const increment = () => setQuantity((prev) => prev + 1);
  const decrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div>
      <p className="font-medium mb-2">Quantity</p>
      <div className="flex items-center gap-6 w-fit border border-gray-300 rounded-2xl px-6 py-3 bg-white">
        <button
          onClick={decrement}
          className="text-3xl font-light text-gray-500 hover:text-black active:scale-90 transition w-8"
        >
          −
        </button>

        <span className="text-2xl font-semibold w-10 text-center">
          {quantity}
        </span>

        <button
          onClick={increment}
          className="text-3xl font-light text-gray-500 hover:text-black active:scale-90 transition w-8"
        >
          +
        </button>
      </div>
    </div>
  );
}