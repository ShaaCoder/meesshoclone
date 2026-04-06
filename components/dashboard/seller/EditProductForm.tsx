"use client";

import { useState } from "react";
import { updateProduct } from "@/app/actions/seller";
import DynamicAttributes from "@/components/DynamicAttributes";

export default function EditProductForm({
  product,
  categories,
  onClose,
}: any) {
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [preview, setPreview] = useState<string[]>([]);

  // ✅ existing images count
  const existingCount = product.product_images?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl p-6 rounded-xl space-y-4 overflow-y-auto max-h-[90vh]">

        <h2 className="text-xl font-bold">Edit Product</h2>

        <form action={updateProduct} className="grid md:grid-cols-2 gap-4">

          <input type="hidden" name="id" value={product.id} />

          <input
            name="name"
            defaultValue={product.name}
            className="border p-2 rounded"
          />

          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border p-2 rounded"
          >
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            name="base_price"
            type="number"
            defaultValue={product.base_price}
            className="border p-2 rounded"
          />

          <input
            name="selling_price"
            type="number"
            defaultValue={product.selling_price}
            className="border p-2 rounded"
          />

          <input
            name="stock"
            type="number"
            defaultValue={product.stock}
            className="border p-2 rounded"
          />

          {/* 🔥 EXISTING IMAGES */}
          <div className="md:col-span-2">
            <p className="text-sm font-semibold mb-2">
              Existing Images ({existingCount}/5)
            </p>

            <div className="flex gap-2 flex-wrap">
              {product.product_images?.map((img: any) => (
                <img
                  key={img.id}
                  src={img.url}
                  className="h-16 w-16 rounded object-cover"
                />
              ))}
            </div>
          </div>

          {/* 🔥 ADD NEW IMAGES */}
          <div className="md:col-span-2 space-y-2">
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              className="border p-2 rounded w-full"
              disabled={existingCount >= 5}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);

                if (existingCount + files.length > 5) {
                  alert(`Max 5 images allowed (you already have ${existingCount})`);
                  return;
                }

                const urls = files.map((f) =>
                  URL.createObjectURL(f)
                );

                setPreview(urls);
              }}
            />

            <p className="text-xs text-gray-500">
              Max 5 images allowed
            </p>

            {/* PREVIEW */}
            <div className="flex gap-2 flex-wrap">
              {preview.map((src, i) => (
                <img key={i} src={src} className="h-16 w-16 rounded" />
              ))}
            </div>

            {/* 🚫 LIMIT MESSAGE */}
            {existingCount >= 5 && (
              <p className="text-red-500 text-sm">
                Max image limit reached
              </p>
            )}
          </div>

          <textarea
            name="description"
            defaultValue={product.description}
            className="border p-2 rounded md:col-span-2"
          />

          <DynamicAttributes categoryId={categoryId} />

          <button className="bg-black text-white py-2 rounded md:col-span-2">
            Update Product
          </button>
        </form>

        <button
          onClick={onClose}
          className="text-red-500 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}