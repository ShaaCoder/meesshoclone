"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  createProduct,
} from "@/app/actions/seller";

type Variant = {
  size: string;
  color: string;
  cost_price: string;
  mrp: string;
  stock: string;
};

type UploadedImage = {
  file: File;
  preview: string;
  color: string;
};

export default function ProductForm({
  categories,
}: any) {

  /* =========================================================
     🧠 STATE
  ========================================================= */

  const [isPending, startTransition] =
    useTransition();

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    variants,
    setVariants,
  ] = useState<Variant[]>([
    {
      size: "",
      color: "",
      cost_price: "",
      mrp: "",
      stock: "",
    },
  ]);

  const [
    uploadedImages,
    setUploadedImages,
  ] = useState<
    UploadedImage[]
  >([]);

  const [message, setMessage] =
    useState("");

  /* =========================================================
     ➕ ADD VARIANT
  ========================================================= */

  function addVariant() {

    setVariants((prev) => [
      ...prev,
      {
        size: "",
        color: "",
        cost_price: "",
        mrp: "",
        stock: "",
      },
    ]);
  }

  /* =========================================================
     ✏️ UPDATE VARIANT
  ========================================================= */

  function updateVariant(
    index: number,
    key: keyof Variant,
    value: string
  ) {

    setVariants((prev) =>
      prev.map(
        (
          variant,
          i
        ) =>
          i === index
            ? {
                ...variant,
                [key]: value,
              }
            : variant
      )
    );
  }

  /* =========================================================
     🖼 IMAGE UPLOAD
  ========================================================= */

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const files =
      Array.from(
        e.target.files || []
      );

    if (!files.length) {
      return;
    }

    const images =
      files.map((file) => ({
        file,

        preview:
          URL.createObjectURL(
            file
          ),

        color: "",
      }));

    setUploadedImages(
      (prev) => [
        ...prev,
        ...images,
      ]
    );
  }

  /* =========================================================
     🎨 IMAGE COLOR
  ========================================================= */

  function updateImageColor(
    index: number,
    color: string
  ) {

    setUploadedImages(
      (prev) =>
        prev.map(
          (
            image,
            i
          ) =>
            i === index
              ? {
                  ...image,
                  color,
                }
              : image
        )
    );
  }

  /* =========================================================
     ❌ REMOVE IMAGE
  ========================================================= */

  function removeImage(
    index: number
  ) {

    setUploadedImages(
      (prev) =>
        prev.filter(
          (_, i) =>
            i !== index
        )
    );
  }

  /* =========================================================
     🚀 SUBMIT
  ========================================================= */

  function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();

    setMessage("");

    startTransition(
      async () => {

        try {

          const formData =
            new FormData();

          formData.append(
            "name",
            name
          );

          formData.append(
            "description",
            description
          );

          formData.append(
            "category_id",
            categoryId
          );

          formData.append(
            "variants",
            JSON.stringify(
              variants
            )
          );

          /* =========================================================
             🖼 IMAGES
          ========================================================= */

          uploadedImages.forEach(
            (img) => {

              formData.append(
                "images",
                img.file
              );
            }
          );

          /* =========================================================
             🎨 IMAGE META
          ========================================================= */

          formData.append(
            "imagesMeta",
            JSON.stringify(
              uploadedImages.map(
                (
                  img
                ) => ({
                  color:
                    img.color
                      ? String(
                          img.color
                        ).toLowerCase()
                      : null,
                })
              )
            )
          );

          const result =
            await createProduct(
              formData
            );

          if (
            result.success
          ) {

            setMessage(
              "✅ Product created successfully"
            );

            setName("");

            setDescription(
              ""
            );

            setCategoryId(
              ""
            );

            setVariants([
              {
                size: "",
                color: "",
                cost_price:
                  "",
                mrp: "",
                stock: "",
              },
            ]);

            setUploadedImages(
              []
            );

          } else {

            setMessage(
              result.message ||
                "Failed to create product"
            );
          }

        } catch (
          err: any
        ) {

          setMessage(
            err.message ||
              "Something went wrong"
          );
        }
      }
    );
  }

  /* =========================================================
     🚀 UI
  ========================================================= */

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-8 text-black"
    >

      {/* =========================================================
         PRODUCT INFO
      ========================================================= */}

      <div className="bg-white border rounded-3xl p-6 space-y-5">

        <h2 className="text-xl font-bold">

          Product Information

        </h2>

        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          className="w-full border rounded-2xl px-4 py-3"
          required
        />

        <textarea
          placeholder="Description"
          value={
            description
          }
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          className="w-full border rounded-2xl px-4 py-3 min-h-[140px]"
        />

        <select
          value={categoryId}
          onChange={(e) =>
            setCategoryId(
              e.target.value
            )
          }
          className="w-full border rounded-2xl px-4 py-3"
          required
        >

          <option value="">
            Select Category
          </option>

          {categories?.map(
            (category: any) => (

              <option
                key={
                  category.id
                }
                value={
                  category.id
                }
              >

                {
                  category.name
                }

              </option>
            )
          )}

        </select>

      </div>

      {/* =========================================================
         VARIANTS
      ========================================================= */}

      <div className="bg-white border rounded-3xl p-6 space-y-5">

        <div className="flex items-center justify-between">

          <h2 className="text-xl font-bold">

            Variants

          </h2>

          <button
            type="button"
            onClick={
              addVariant
            }
            className="px-4 py-2 bg-black text-white rounded-xl"
          >

            Add Variant

          </button>

        </div>

        {variants.map(
          (
            variant,
            index
          ) => (

            <div
              key={index}
              className="grid md:grid-cols-5 gap-4 border rounded-2xl p-4"
            >

              <input
                type="text"
                placeholder="Size"
                value={
                  variant.size
                }
                onChange={(e) =>
                  updateVariant(
                    index,
                    "size",
                    e.target
                      .value
                  )
                }
                className="border rounded-xl px-3 py-2"
              />

              <input
                type="text"
                placeholder="Color"
                value={
                  variant.color
                }
                onChange={(e) =>
                  updateVariant(
                    index,
                    "color",
                    e.target
                      .value
                  )
                }
                className="border rounded-xl px-3 py-2"
              />

              <input
                type="number"
                placeholder="Cost Price"
                value={
                  variant.cost_price
                }
                onChange={(e) =>
                  updateVariant(
                    index,
                    "cost_price",
                    e.target
                      .value
                  )
                }
                className="border rounded-xl px-3 py-2"
              />

              <input
                type="number"
                placeholder="MRP"
                value={
                  variant.mrp
                }
                onChange={(e) =>
                  updateVariant(
                    index,
                    "mrp",
                    e.target
                      .value
                  )
                }
                className="border rounded-xl px-3 py-2"
              />

              <input
                type="number"
                placeholder="Stock"
                value={
                  variant.stock
                }
                onChange={(e) =>
                  updateVariant(
                    index,
                    "stock",
                    e.target
                      .value
                  )
                }
                className="border rounded-xl px-3 py-2"
              />

            </div>
          )
        )}

      </div>

      {/* =========================================================
         IMAGES
      ========================================================= */}

      <div className="bg-white border rounded-3xl p-6 space-y-5">

        <h2 className="text-xl font-bold">

          Product Images

        </h2>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={
            handleImageUpload
          }
          className="block"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

          {uploadedImages.map(
            (
              image,
              index
            ) => (

              <div
                key={index}
                className="border rounded-2xl p-3 space-y-3"
              >

                <img
                  src={
                    image.preview
                  }
                  alt=""
                  className="w-full h-40 object-cover rounded-xl"
                />

                <input
                  type="text"
                  placeholder="Assign Color"
                  value={
                    image.color
                  }
                  onChange={(e) =>
                    updateImageColor(
                      index,
                      e.target
                        .value
                    )
                  }
                  className="w-full border rounded-xl px-3 py-2"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeImage(
                      index
                    )
                  }
                  className="w-full bg-red-500 text-white rounded-xl py-2"
                >

                  Remove

                </button>

              </div>
            )
          )}

        </div>

      </div>

      {/* =========================================================
         SUBMIT
      ========================================================= */}

      <div className="space-y-4">

        <button
          type="submit"
          disabled={
            isPending
          }
          className="w-full bg-black text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
        >

          {isPending
            ? "Creating Product..."
            : "Create Product"}

        </button>

        {message && (

          <div className="text-sm text-center font-medium">

            {message}

          </div>
        )}

      </div>

    </form>
  );
}