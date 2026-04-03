"use client";

import { useState } from "react";
import {
  updateProduct,
  deleteProduct,
  createProduct,
} from "@/app/actions/seller";
import DynamicAttributes from "@/components/DynamicAttributes";

export default function ProductsClient({ products, categories }: any) {
  const [categoryId, setCategoryId] = useState("");

  return (
    <div className="space-y-6 text-black">
      <h1 className="text-2xl font-bold">Your Products</h1>

      {/* ================= ADD PRODUCT ================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Add Product</h2>

        <form action={createProduct} className="grid md:grid-cols-2 gap-4">

          <input name="name" placeholder="Product Name" required className="border p-2 rounded" />

          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="border p-2 rounded"
          >
            <option value="">Select Category</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input name="base_price" type="number" placeholder="Base Price" required className="border p-2 rounded" />

          <input name="selling_price" type="number" placeholder="Selling Price" className="border p-2 rounded" />

          <input name="stock" type="number" placeholder="Stock" className="border p-2 rounded" />

          <input name="image" placeholder="Image URL" className="border p-2 rounded" />

          <textarea name="description" placeholder="Description" className="border p-2 rounded md:col-span-2" />

          <DynamicAttributes categoryId={categoryId} />

          {/* VARIANTS */}
          <div className="md:col-span-2 border p-4 rounded space-y-3">
            <h3 className="font-semibold">Variants</h3>

            <input name="sizes" placeholder="Sizes (S,M,L)" className="border p-2 w-full rounded" />
            <input name="colors" placeholder="Colors (Red,Blue)" className="border p-2 w-full rounded" />
            <input name="variant_price" type="number" placeholder="Variant Price" className="border p-2 w-full rounded" />
            <input name="variant_stock" type="number" placeholder="Stock per Variant" className="border p-2 w-full rounded" />
          </div>

          <button className="bg-black text-white py-3 rounded md:col-span-2">
            Add Product
          </button>
        </form>
      </div>

      {/* PRODUCTS LIST */}
      <div className="grid md:grid-cols-3 gap-6">
        {products?.map((p: any) => (
          <div key={p.id} className="bg-white p-4 rounded-xl shadow">

            <img src={p.image} className="h-40 w-full object-cover rounded" />

            <h2 className="font-bold">{p.name}</h2>

            <p className="text-sm text-gray-500">
              {p.categories?.name}
            </p>

          </div>
        ))}
      </div>
    </div>
  );
}