"use client";

import { useState } from "react";
import {
  updateProduct,
  deleteProduct,
  createProduct,
} from "@/app/actions/seller";
import DynamicAttributes from "@/components/DynamicAttributes";

/* ============================= */
/* ✏️ EDIT FORM COMPONENT */
/* ============================= */
function EditProductForm({ product, categories, onClose }: any) {
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [preview, setPreview] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl p-6 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">

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

          {/* 🔥 ADD NEW IMAGES */}
          <div className="space-y-2">
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              className="border p-2 rounded w-full"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const urls = files.map((f) =>
                  URL.createObjectURL(f)
                );
                setPreview(urls);
              }}
            />

            <div className="flex gap-2 flex-wrap">
              {preview.map((src, i) => (
                <img key={i} src={src} className="h-16 w-16 rounded" />
              ))}
            </div>
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

        <button onClick={onClose} className="text-red-500 text-sm">
          Close
        </button>
      </div>
    </div>
  );
}

/* ============================= */
/* 🛍 MAIN COMPONENT */
/* ============================= */
export default function ProductsClient({ products, categories }: any) {
  const [categoryId, setCategoryId] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);

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

          {/* 🔥 MULTIPLE IMAGE UPLOAD */}
          <div className="space-y-2">
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              className="border p-2 rounded w-full"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const urls = files.map((file) =>
                  URL.createObjectURL(file)
                );
                setPreview(urls);
              }}
            />

            <div className="flex gap-2 flex-wrap">
              {preview.map((src, i) => (
                <img key={i} src={src} className="h-20 w-20 rounded" />
              ))}
            </div>
          </div>

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

      {/* ================= PRODUCTS LIST ================= */}
      <div className="grid md:grid-cols-3 gap-6">
        {products?.map((p: any) => (
          <div key={p.id} className="bg-white p-4 rounded-xl shadow space-y-3">

            {/* IMAGE GALLERY */}
            <div className="flex gap-2 overflow-x-auto">
              {p.product_images?.length > 0 ? (
                p.product_images.map((img: any) => (
                  <img key={img.id} src={img.url} className="h-20 w-20 rounded" />
                ))
              ) : (
                <img src={p.image || "/placeholder.png"} className="h-20 w-20 rounded" />
              )}
            </div>

            <h2 className="font-bold">{p.name}</h2>

            <p className="text-sm text-gray-500">
              {p.categories?.name}
            </p>

            {/* 🔥 EDIT BUTTON */}
            <button
              onClick={() => setEditingProduct(p)}
              className="bg-yellow-500 text-white py-1 rounded w-full"
            >
              Edit
            </button>

            {/* 🗑 DELETE */}
            <button
              onClick={() => deleteProduct(p.id)}
              className="bg-red-500 text-white py-1 rounded w-full"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* 🔥 EDIT MODAL */}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}