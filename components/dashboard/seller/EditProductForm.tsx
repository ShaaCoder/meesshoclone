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
  const [errors, setErrors] = useState<any>({});

  const existingCount = product.product_images?.length || 0;

  /* ================= HSN MAP ================= */
  const HSN_MAP: any = {
    clothing: "6109",
    electronics: "8517",
    beauty: "3304",
    furniture: "9403",
  };

  /* ================= VALIDATION ================= */
  const validate = (formData: FormData) => {
    let newErrors: any = {};

    const name = formData.get("name");
    const base_price = formData.get("base_price");
    const gst = formData.get("gst_percent");
    const hsn = formData.get("hsn_code");

    if (!name) newErrors.name = "Product name is required";
    if (!base_price) newErrors.base_price = "Base price required";
    if (!gst) newErrors.gst = "GST is required";
    if (!hsn) newErrors.hsn = "HSN code is required";

    return newErrors;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl p-6 rounded-xl space-y-6 overflow-y-auto max-h-[90vh]">

        <h2 className="text-xl font-bold">Edit Product</h2>

        <form
          action={async (formData) => {
            const errs = validate(formData);

            if (Object.keys(errs).length > 0) {
              setErrors(errs);
              return;
            }

            await updateProduct(formData);
          }}
          className="space-y-6"
        >
          <input type="hidden" name="id" value={product.id} />

          {/* ================= BASIC ================= */}
          <div className="space-y-2">
            <h3 className="font-semibold">Basic Info</h3>

            <input
              name="name"
              defaultValue={product.name || ""}
              placeholder="Product Name (e.g. Cotton Kurti)"
              className="border p-2 rounded w-full"
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}

            <select
              name="category_id"
              value={categoryId}
              onChange={(e) => {
                const value = e.target.value;
                setCategoryId(value);

                const category = categories.find((c: any) => c.id === value);

                if (category) {
                  const key = category.name.toLowerCase();
                  const hsn = HSN_MAP[key];

                  if (hsn) {
                    const input = document.querySelector(
                      "input[name='hsn_code']"
                    ) as HTMLInputElement;

                    if (input && !input.value) {
                      input.value = hsn;
                    }
                  }
                }
              }}
              className="border p-2 rounded w-full"
            >
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <textarea
              name="description"
              defaultValue={product.description || ""}
              placeholder="Product Description"
              className="border p-2 rounded w-full"
            />
          </div>

          {/* ================= PRICING ================= */}
          <div className="space-y-2">
            <h3 className="font-semibold">Pricing</h3>

            <div className="grid grid-cols-3 gap-2">
              <input
                name="base_price"
                type="number"
                defaultValue={product.base_price ?? ""}
                placeholder="Base Price"
                className="border p-2 rounded"
              />
              {errors.base_price && (
                <p className="text-red-500 text-xs col-span-3">
                  {errors.base_price}
                </p>
              )}

              <input
                name="selling_price"
                type="number"
                defaultValue={product.selling_price ?? ""}
                placeholder="Selling Price"
                className="border p-2 rounded"
              />

              <input
                name="stock"
                type="number"
                defaultValue={product.stock ?? ""}
                placeholder="Stock"
                className="border p-2 rounded"
              />
            </div>
          </div>

          {/* ================= PRODUCT DETAILS ================= */}
          <div className="space-y-2">
            <h3 className="font-semibold">Product Details</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  name="gst_percent"
                  type="number"
                  defaultValue={product.gst_percent ?? ""}
                  placeholder="GST % (5, 12, 18)"
                  className="border p-2 rounded w-full"
                />
                {errors.gst && (
                  <p className="text-red-500 text-xs">{errors.gst}</p>
                )}
              </div>

              <div>
                <input
                  name="hsn_code"
                  defaultValue={product.hsn_code || ""}
                  placeholder="HSN Code (auto-filled)"
                  className="border p-2 rounded w-full"
                />
                {errors.hsn && (
                  <p className="text-red-500 text-xs">{errors.hsn}</p>
                )}
              </div>

              <input
                name="country_of_origin"
                defaultValue={product.country_of_origin || ""}
                placeholder="Country (India)"
                className="border p-2 rounded"
              />

              <input
                name="tags"
                defaultValue={product.tags?.join(",") || ""}
                placeholder="Tags (cotton, casual)"
                className="border p-2 rounded"
              />
            </div>

            <p className="text-xs text-gray-500">
              HSN auto-filled based on category
            </p>
          </div>

          {/* ================= IMAGES ================= */}
          <div className="space-y-2">
            <h3 className="font-semibold">Images</h3>

            <p className="text-sm text-gray-500">
              Existing Images ({existingCount}/5)
            </p>

            <div className="flex gap-2 flex-wrap">
              {product.product_images?.map((img: any) => (
                <img key={img.id} src={img.url} className="h-16 w-16 rounded" />
              ))}
            </div>

            <input
              type="file"
              name="images"
              multiple
              disabled={existingCount >= 5}
              className="border p-2 rounded w-full"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setPreview(files.map((f) => URL.createObjectURL(f)));
              }}
            />

            <div className="flex gap-2 flex-wrap">
              {preview.map((src, i) => (
                <img key={i} src={src} className="h-16 w-16 rounded" />
              ))}
            </div>
          </div>

          <DynamicAttributes categoryId={categoryId} />

          <button className="bg-black text-white py-3 rounded w-full">
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