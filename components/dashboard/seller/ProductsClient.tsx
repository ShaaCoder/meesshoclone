"use client";

import { useState, useTransition } from "react";
import {
  createProduct,
  deleteProduct,
} from "@/app/actions/seller";

/* ============================= */
/* TYPES */
/* ============================= */
type Variant = {
  size: string;
  color: string;
  cost_price: string;
  mrp: string;
  stock: string;
};

/* ============================= */
/* IMAGE UPLOAD */
/* ============================= */
function ImageUpload({ files, setFiles }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    setFiles((prev: File[]) => [...prev, ...Array.from(fileList)]);
  };

  const removeImage = (index: number) => {
    setFiles((prev: File[]) => prev.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-2 text-black">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleChange}
        className="border p-2 w-full rounded text-black"
      />

      <div className="flex gap-3 flex-wrap">
        {files.map((file: File, i: number) => (
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
/* VARIANTS */
/* ============================= */
function VariantGenerator({ variants, setVariants }: any) {
  const sizesList = ["S", "M", "L", "XL", "XXL"];

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");

  const generateVariants = () => {
    if (!selectedSizes.length || !colors.length) return;

    const newVariants: Variant[] = [];

    selectedSizes.forEach((size) => {
      colors.forEach((color) => {
        newVariants.push({
          size,
          color,
          cost_price: "",
          mrp: "",
          stock: "",
        });
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
    <div className="border p-4 rounded-xl space-y-3 text-black">
      <p className="font-semibold">Variants</p>

      {/* Sizes */}
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
                : "border text-black"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Colors */}
      <div className="flex gap-2">
        <input
          value={colorInput}
          onChange={(e) => setColorInput(e.target.value)}
          placeholder="Add color"
          className="border px-2 py-1 flex-1 rounded text-black"
        />
        <button
          type="button"
          onClick={() => {
            if (!colorInput || colors.includes(colorInput)) return;
            setColors([...colors, colorInput]);
            setColorInput("");
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
        <>
          <div className="grid grid-cols-5 gap-2 text-sm font-medium">
            <span>Size</span>
            <span>Color</span>
            <span>MRP</span>
            <span>Cost</span>
            <span>Stock</span>
          </div>

          {variants.map((v: Variant, i: number) => (
            <div key={i} className="grid grid-cols-5 gap-2">
              <span>{v.size}</span>
              <span>{v.color}</span>

              <input
                value={v.mrp}
                onChange={(e) => updateVariant(i, "mrp", e.target.value)}
                className="border px-2 rounded text-black"
              />
              <input
                value={v.cost_price}
                onChange={(e) =>
                  updateVariant(i, "cost_price", e.target.value)
                }
                className="border px-2 rounded text-black"
              />
              <input
                value={v.stock}
                onChange={(e) => updateVariant(i, "stock", e.target.value)}
                className="border px-2 rounded text-black"
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ============================= */
/* ADD PRODUCT */
/* ============================= */
function AddProductForm({ categories }: any) {
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

        if (!variants.length) {
          setError("Generate variants first");
          return;
        }

        formData.set("variants", JSON.stringify(variants));

        files.forEach((file) => formData.append("images", file));

        startTransition(async () => {
          const res = await createProduct(formData);

          if (!res?.success) {
            setError(res?.message || "Failed");
            return;
          }

          setSuccess("Product created ✅");
          setVariants([]);
          setFiles([]);
        });
      }}
      className="space-y-4 border p-6 rounded-2xl bg-white shadow text-black"
    >
      <h2 className="font-bold text-xl">Add Product</h2>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <input name="name" placeholder="Product name" className="border p-2 w-full rounded text-black" />

      <textarea name="description" placeholder="Description" className="border p-2 w-full rounded text-black" />

      <select name="category_id" required className="border p-2 w-full rounded text-black">
        <option value="">Select Category</option>
        {categories.map((c: any) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <ImageUpload files={files} setFiles={setFiles} />
      <VariantGenerator variants={variants} setVariants={setVariants} />

      <button disabled={isPending} className="bg-green-600 text-white px-4 py-2 rounded-xl w-full">
        {isPending ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}

/* ============================= */
/* MAIN */
/* ============================= */
export default function ProductsClient({ products, categories }: any) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6 text-black">
      <AddProductForm categories={categories} />

      {!products.length ? (
        <p className="text-center text-gray-500">No products yet</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p: any) => {
            const image =
              p.product_images?.find((img: any) => img.is_primary)?.url ||
              p.product_images?.[0]?.url ||
              "/placeholder.png";

            return (
              <div key={p.id} className="border p-3 rounded-xl">
                <img src={image} className="h-32 w-full object-cover rounded" />

                <p className="font-medium mt-2">{p.name}</p>
                <p className="text-xs text-gray-500">{p.status}</p>

                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm("Archive this product?")) return;

                    startTransition(async () => {
                      const res = await deleteProduct(p.id);
                      if (!res?.success) {
                        alert(res?.message || "Delete failed");
                      }
                    });
                  }}
                  className="bg-red-500 text-white px-3 py-1 rounded mt-2"
                >
                  Archive
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}