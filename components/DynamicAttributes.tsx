"use client";

import { useEffect, useState } from "react";

export default function DynamicAttributes({ categoryId }: { categoryId: string }) {
  const [attributes, setAttributes] = useState<any[]>([]);

  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }

    fetch(`/api/attributes?category_id=${categoryId}`)
      .then((res) => res.json())
      .then((data) => setAttributes(data));
  }, [categoryId]);

  if (!attributes.length) return null;

  return (
    <div className="md:col-span-2 space-y-3 border p-4 rounded">
      <h3 className="font-semibold">Product Details</h3>

      {attributes.map((attr) => (
        <div key={attr.id}>
          <label className="text-sm">{attr.name}</label>

          {attr.type === "select" ? (
            <select
              name={`attr_${attr.id}`}
              className="border p-2 w-full rounded"
              required={attr.is_required}
            >
              <option value="">Select {attr.name}</option>
              {attr.options?.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={`attr_${attr.id}`}
              placeholder={attr.name}
              className="border p-2 w-full rounded"
              required={attr.is_required}
            />
          )}
        </div>
      ))}
    </div>
  );
}