"use client";

import { useState, useTransition } from "react";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/actions/seller";

/* ============================= */
/* TYPES */
/* ============================= */

type Variant = {
  size: string;
  color: string;
  price: string;
  mrp: string;
  stock: string;
};

/* ============================= */
/* 🖼 IMAGE UPLOAD */
/* ============================= */

function ImageUpload({
  files,
  setFiles,
}: {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const selected: File[] = Array.from(fileList);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleChange}
        className="border p-2 w-full"
      />

      <div className="flex gap-3 flex-wrap">
        {files.map((file, i) => (
          <div key={i} className="relative">
            <img
              src={URL.createObjectURL(file)}
              className="h-20 w-20 object-cover rounded"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================= */
/* 🔥 VARIANTS */
/* ============================= */

function VariantGenerator({
  variants,
  setVariants,
}: {
  variants: Variant[];
  setVariants: (v: Variant[]) => void;
}) {
  const sizesList = ["S", "M", "L", "XL", "XXL"];

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");

  const generateVariants = () => {
    const newVariants: Variant[] = [];

    selectedSizes.forEach((size) => {
      colors.forEach((color) => {
        newVariants.push({ size, color, price: "", mrp: "", stock: "" });
      });
    });

    setVariants(newVariants);
  };

  const updateVariant = (i: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[i][field] = value;
    setVariants(updated);
  };

  return (
    <div className="border p-4 rounded-xl space-y-3">
      <p className="font-semibold">Variants</p>

      <div className="flex gap-2 flex-wrap">
        {sizesList.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              setSelectedSizes((prev) =>
                prev.includes(s)
                  ? prev.filter((x) => x !== s)
                  : [...prev, s]
              )
            }
            className={`px-3 py-1 rounded ${
              selectedSizes.includes(s)
                ? "bg-black text-white"
                : "border"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={colorInput}
          onChange={(e) => setColorInput(e.target.value)}
          placeholder="Add color"
          className="border px-2 py-1 flex-1"
        />
        <button
          type="button"
          onClick={() => {
            if (colorInput) {
              setColors([...colors, colorInput]);
              setColorInput("");
            }
          }}
          className="px-3 py-1 bg-black text-white rounded"
        >
          Add
        </button>
      </div>

      <button
        type="button"
        onClick={generateVariants}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Generate Variants
      </button>

      {variants.length > 0 && (
        <div className="grid grid-cols-5 gap-2 text-sm font-medium">
          <span>Size</span>
          <span>Color</span>
          <span>MRP</span>
          <span>Price</span>
          <span>Stock</span>
        </div>
      )}

      {variants.map((v, i) => (
        <div key={i} className="grid grid-cols-5 gap-2">
          <span>{v.size}</span>
          <span>{v.color}</span>

          <input
            value={v.mrp}
            onChange={(e) =>
              updateVariant(i, "mrp", e.target.value)
            }
            className="border px-2"
          />
          <input
            value={v.price}
            onChange={(e) =>
              updateVariant(i, "price", e.target.value)
            }
            className="border px-2"
          />
          <input
            value={v.stock}
            onChange={(e) =>
              updateVariant(i, "stock", e.target.value)
            }
            className="border px-2"
          />
        </div>
      ))}
    </div>
  );
}

/* ============================= */
/* ➕ ADD PRODUCT */
/* ============================= */

function AddProductForm({ categories }: { categories: any[] }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError("");
        setSuccess("");

        files.forEach((file) =>
          formData.append("images", file)
        );

        startTransition(async () => {
          const res = await createProduct(formData);

          if (!res?.success) {
            setError(res?.message || "Failed");
            return;
          }

          setSuccess("Product created successfully ✅");
          setVariants([]);
          setFiles([]);
        });
      }}
      className="space-y-4 border p-6 rounded-2xl bg-white shadow"
    >
      <h2 className="font-bold text-xl">Add Product</h2>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(variants)}
      />

      <input
        name="name"
        placeholder="Product name"
        className="border p-2 w-full rounded"
      />

      <textarea
        name="description"
        placeholder="Description"
        className="border p-2 w-full rounded"
      />

      <select
        name="category_id"
        className="border p-2 w-full rounded"
      >
        <option value="">Select Category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <ImageUpload files={files} setFiles={setFiles} />
      <VariantGenerator
        variants={variants}
        setVariants={setVariants}
      />

      <button
        disabled={isPending}
        className="bg-green-600 text-white px-4 py-2 rounded-xl w-full"
      >
        {isPending ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}

/* ============================= */
/* ✏️ EDIT MODAL */
/* ============================= */

function EditProductModal({ product, categories }: any) {
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState(
    product.product_variants || []
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        Edit
      </button>
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-[500px] max-h-[90vh] overflow-auto">
        {error && <p className="text-red-500">{error}</p>}

        <form
          action={(formData) => {
            formData.append("id", product.id);

            startTransition(async () => {
              const res = await updateProduct(formData);

              if (!res?.success) {
                setError(res?.message || "Update failed");
                return;
              }

              setOpen(false);
            });
          }}
          className="space-y-3"
        >
          <input
            name="name"
            defaultValue={product.name}
            className="border p-2 w-full"
          />

          <textarea
            name="description"
            defaultValue={product.description}
            className="border p-2 w-full"
          />

          <select
            name="category_id"
            defaultValue={product.category_id}
            className="border p-2 w-full"
          >
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="hidden"
            name="variants"
            value={JSON.stringify(variants)}
          />

          <VariantGenerator
            variants={variants}
            setVariants={setVariants}
          />

          <div className="flex gap-2">
            <button
              disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {isPending ? "Updating..." : "Update"}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================= */
/* MAIN */
/* ============================= */

export default function ProductsClient({
  products,
  categories,
}: any) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <AddProductForm categories={categories} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p: any) => (
          <div key={p.id} className="border p-3 rounded-xl">
            <img
              src={p.image}
              className="h-32 w-full object-cover rounded"
            />

            <p className="font-medium mt-2">{p.name}</p>

            <div className="flex gap-2 mt-3">
              <EditProductModal
                product={p}
                categories={categories}
              />

              <button
                disabled={isPending}
                onClick={() => {
                  if (!confirm("Archive this product?"))
                    return;

                  startTransition(async () => {
                    const res = await deleteProduct(p.id);

                    if (!res?.success) {
                      alert(res?.message || "Delete failed");
                    }
                  });
                }}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                {isPending ? "..." : "Archive"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}