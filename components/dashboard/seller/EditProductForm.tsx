"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  updateProduct,
} from "@/app/actions/seller";

type Variant = {
  id?: string;
  size: string;
  color: string;
  cost_price: string;
  mrp: string;
  stock: string;
};

type ProductImage = {
  id?: string;
  file?: File | null;
  preview: string;
  color: string;
  isExisting?: boolean;
};

export default function EditProductForm({
  product,
  categories,
}: any) {

  const [
    isPending,
    startTransition,
  ] = useTransition();

  /* =========================================================
     📝 PRODUCT INFO
  ========================================================= */

  const [name, setName] =
    useState<string>(
      product?.name || ""
    );

  const [
    description,
    setDescription,
  ] = useState<string>(
    product?.description ||
      ""
  );

  const [
    categoryId,
    setCategoryId,
  ] = useState<string>(
    product?.category_id ||
      ""
  );

  /* =========================================================
     📦 VARIANTS
  ========================================================= */

  const [
    variants,
    setVariants,
  ] = useState<Variant[]>(

    product?.product_variants
      ?.length
      ? product.product_variants.map(
          (v: any) => ({
            id: v.id,

            size:
              v.size ||
              v.attributes
                ?.size ||
              "",

            color:
              v.color ||
              v.attributes
                ?.color ||
              "",

            cost_price:
              String(
                v.cost_price ||
                  ""
              ),

            mrp: String(
              v.mrp || ""
            ),

            stock: String(
              v.stock || ""
            ),
          })
        )
      : [
          {
            size: "",
            color: "",
            cost_price: "",
            mrp: "",
            stock: "",
          },
        ]
  );

  /* =========================================================
     🖼 IMAGES
  ========================================================= */

  const [
    images,
    setImages,
  ] = useState<
    ProductImage[]
  >(

    product?.product_images
      ?.length
      ? product.product_images.map(
          (img: any) => ({
            id: img.id,

            preview:
              img.url || "",

            color:
              img.color ||
              "",

            isExisting:
              true,
          })
        )
      : []
  );

  const [message, setMessage] =
    useState<string>("");

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
    field: keyof Variant,
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
                [field]: value,
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

    const newImages =
      files.map((file) => ({
        file,

        preview:
          URL.createObjectURL(
            file
          ),

        color: "",

        isExisting:
          false,
      }));

    setImages((prev) => [
      ...prev,
      ...newImages,
    ]);
  }

  /* =========================================================
     🎨 IMAGE COLOR
  ========================================================= */

  function updateImageColor(
    index: number,
    color: string
  ) {

    setImages((prev) =>
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

    setImages((prev) =>
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
            "product_id",
            product.id
          );

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
             EXISTING IMAGES
          ========================================================= */

          formData.append(
            "existingImages",
            JSON.stringify(

              images
                .filter(
                  (
                    img
                  ) =>
                    img.isExisting
                )
                .map(
                  (
                    img
                  ) => ({
                    id: img.id,

                    url:
                      img.preview,

                    color:
                      img.color,
                  })
                )
            )
          );

          /* =========================================================
             NEW IMAGES
          ========================================================= */

          const newImages =
            images.filter(
              (img) =>
                !img.isExisting &&
                img.file
            );

          newImages.forEach(
            (img) => {

              if (img.file) {

                formData.append(
                  "images",
                  img.file
                );
              }
            }
          );

          /* =========================================================
             IMAGE META
          ========================================================= */

          formData.append(
            "imagesMeta",
            JSON.stringify(

              newImages.map(
                (img) => ({
                  color:
                    img.color,
                })
              )
            )
          );

          const result =
            await updateProduct(
              formData
            );

          setMessage(
            result?.message ||
              "Product updated successfully"
          );

        } catch (
          err: any
        ) {

          setMessage(
            err?.message ||
              "Something went wrong"
          );
        }
      }
    );
  }

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

        <input
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          placeholder="Product Name"
          className="w-full border rounded-2xl px-4 py-3"
        />

        <textarea
          value={
            description
          }
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          placeholder="Description"
          className="w-full border rounded-2xl px-4 py-3 min-h-[150px]"
        />

        <select
          value={categoryId}
          onChange={(e) =>
            setCategoryId(
              e.target.value
            )
          }
          className="w-full border rounded-2xl px-4 py-3"
        >

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

        <div className="flex justify-between items-center">

          <h2 className="font-bold text-xl">

            Variants

          </h2>

          <button
            type="button"
            onClick={
              addVariant
            }
            className="bg-black text-white px-4 py-2 rounded-xl"
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
              className="grid md:grid-cols-5 gap-4"
            >

              <input
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
                placeholder="Size"
                className="border rounded-xl px-3 py-2"
              />

              <input
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
                placeholder="Color"
                className="border rounded-xl px-3 py-2"
              />

              <input
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
                placeholder="Cost Price"
                className="border rounded-xl px-3 py-2"
              />

              <input
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
                placeholder="MRP"
                className="border rounded-xl px-3 py-2"
              />

              <input
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
                placeholder="Stock"
                className="border rounded-xl px-3 py-2"
              />

            </div>
          )
        )}

      </div>

      {/* =========================================================
         PRODUCT IMAGES
      ========================================================= */}

      <div className="bg-white border rounded-3xl p-6 space-y-5">

        <h2 className="font-bold text-xl">

          Product Images

        </h2>

        <input
          type="file"
          multiple
          onChange={
            handleImageUpload
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {images.map(
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
                  placeholder="Color"
                  className="w-full border rounded-xl px-3 py-2"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeImage(
                      index
                    )
                  }
                  className="w-full bg-red-500 text-white py-2 rounded-xl"
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

      <button
        type="submit"
        disabled={
          isPending
        }
        className="w-full bg-black text-white py-4 rounded-2xl disabled:opacity-50"
      >

        {isPending
          ? "Updating..."
          : "Update Product"}

      </button>

      {message && (

        <p className="text-center text-sm">

          {message}

        </p>
      )}

    </form>
  );
}