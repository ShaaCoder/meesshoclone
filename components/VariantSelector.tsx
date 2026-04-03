"use client";

import { useState, useMemo, useEffect } from "react";

type Variant = {
  id: string;
  size: string;
  color: string;
  price: number;
  stock: number;
};

export default function VariantSelector({
  variants,
  onSelect,
}: {
  variants: Variant[];
  onSelect?: (variant: Variant | null) => void;
}) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");

  const sizes = [...new Set(variants.map(v => v.size))];
  const colors = [...new Set(variants.map(v => v.color))];

  const selectedVariant = useMemo(() => {
    return variants.find(
      v => v.size === size && v.color === color
    ) || null;
  }, [size, color, variants]);

  /* 🔥 SEND TO PARENT */
  useEffect(() => {
    onSelect?.(selectedVariant);
  }, [selectedVariant, onSelect]);

  return (
    <div className="space-y-4">

      {/* SIZE */}
      {sizes.length > 0 && (
        <div>
          <p className="font-semibold">Size</p>
          <div className="flex gap-2 mt-2">
            {sizes.map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1 border rounded ${
                  size === s ? "bg-black text-white" : ""
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COLOR */}
      {colors.length > 0 && (
        <div>
          <p className="font-semibold">Color</p>
          <div className="flex gap-2 mt-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`px-3 py-1 border rounded ${
                  color === c ? "bg-black text-white" : ""
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedVariant && (
        <div className="border p-3 rounded">
          ₹{selectedVariant.price} | Stock: {selectedVariant.stock}
        </div>
      )}
    </div>
  );
}