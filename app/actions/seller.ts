"use server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import sharp from "sharp";
import { generateSellerInvoice } from "./invoice";
import { calculatePrice } from "@/lib/pricing";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { createShipmentForOrder } from "./admin";
 
/* ============================= */
/* 🧠 TYPES */
/* ============================= */
type ActionResponse = {
  success: boolean;
  message?: string;
};

/* ============================= */
/* 🧠 HELPERS */
/* ============================= */

function generateSlug(name: string) {
  return (
    name.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(Math.random() * 10000)
  );
}

async function validateSeller(userId: string) {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (!data || data.role !== "seller") {
    throw new Error("Only sellers allowed");
  }
}

/* ============================= */
/* 🖼 IMAGE */
/* ============================= */

async function compressImage(file: File) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const compressed = await sharp(buffer)
      .resize(800)
      .jpeg({ quality: 70 })
      .toBuffer();

    return new File([new Uint8Array(compressed)], file.name, {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

async function uploadImage(file: File) {
  const supabase = await getSupabaseServer();

  const fileName = `${Date.now()}-${Math.random()}-${file.name}`;

  const { error } = await supabase.storage
    .from("products")
    .upload(fileName, file);

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from("products")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
/* ============================= */
/* 📄 DOCUMENT UPLOAD */
/* ============================= */

async function uploadSellerDocument(
  file: File,
  sellerId: string,
  folder: string
) {
  const ext =
    file.name.split(".").pop() || "jpg";

  const fileName =
    `${sellerId}/${folder}-${crypto.randomUUID()}.${ext}`;

  const { error } =
    await supabaseAdmin.storage
      .from("seller-documents")
      .upload(fileName, file, {
        upsert: true,
      });

  if (error) {
    throw new Error(error.message);
  }

  return fileName;
}

/* ============================= */
/* 🏢 SELLER KYC */
/* ============================= */

export async function submitSellerDocuments(
  formData: FormData
) {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const panNumber = String(
    formData.get("pan_number") || ""
  )
    .trim()
    .toUpperCase();

  const aadhaarNumber = String(
    formData.get("aadhaar_number") || ""
  )
    .replace(/\s/g, "");

  const gstNumber = String(
    formData.get("gst_number") || ""
  )
    .trim()
    .toUpperCase();

  const panImage =
    formData.get("pan_image") as File;

  const aadhaarFront =
    formData.get("aadhaar_front") as File;

  const aadhaarBack =
    formData.get("aadhaar_back") as File;

  const gstCertificate =
    formData.get("gst_certificate") as File;

  const bankProof =
    formData.get("bank_proof") as File;

  if (
    !panNumber ||
    !aadhaarNumber ||
    !gstNumber
  ) {
    throw new Error(
      "All details required"
    );
  }

  const panRegex =
    /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  if (!panRegex.test(panNumber)) {
    throw new Error(
      "Invalid PAN Number"
    );
  }

  const gstRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstRegex.test(gstNumber)) {
    throw new Error(
      "Invalid GST Number"
    );
  }

  const panFromGST =
    gstNumber.slice(2, 12);

  if (panFromGST !== panNumber) {
    throw new Error(
      "PAN and GST mismatch"
    );
  }

  const panPath =
    await uploadSellerDocument(
      panImage,
      user.id,
      "pan"
    );

  const aadhaarFrontPath =
    await uploadSellerDocument(
      aadhaarFront,
      user.id,
      "aadhaar-front"
    );

  const aadhaarBackPath =
    await uploadSellerDocument(
      aadhaarBack,
      user.id,
      "aadhaar-back"
    );

  const gstPath =
    await uploadSellerDocument(
      gstCertificate,
      user.id,
      "gst"
    );

  const bankPath =
    await uploadSellerDocument(
      bankProof,
      user.id,
      "bank"
    );

  const {
    data: existing,
  } = await supabaseAdmin
    .from("seller_documents")
    .select("id")
    .eq("seller_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("seller_documents")
      .update({
        pan_number: panNumber,
        pan_image: panPath,

        aadhaar_number:
          aadhaarNumber,

        aadhaar_front:
          aadhaarFrontPath,

        aadhaar_back:
          aadhaarBackPath,

        gst_number:
          gstNumber,

        gst_certificate:
          gstPath,

        bank_proof:
          bankPath,

        verification_status:
          "pending",

        rejection_reason:
          null,
      })
      .eq(
        "seller_id",
        user.id
      );
  } else {
    await supabaseAdmin
      .from("seller_documents")
      .insert({
        seller_id: user.id,

        pan_number:
          panNumber,

        pan_image:
          panPath,

        aadhaar_number:
          aadhaarNumber,

        aadhaar_front:
          aadhaarFrontPath,

        aadhaar_back:
          aadhaarBackPath,

        gst_number:
          gstNumber,

        gst_certificate:
          gstPath,

        bank_proof:
          bankPath,

        verification_status:
          "pending",
      });
  }

  revalidatePath(
    "/dashboard/seller/verification"
  );

  return {
    success: true,
  };
}
/* ============================= */
/* 📄 GET KYC */
/* ============================= */

export async function getSellerDocuments() {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } =
    await supabaseAdmin
      .from("seller_documents")
      .select("*")
      .eq(
        "seller_id",
        user.id
      )
      .maybeSingle();

  return data;
}
/* ============================= */
/* ➕ CREATE PRODUCT */
/* ============================= */

export async function createProduct(
  formData: FormData
): Promise<ActionResponse> {

  try {

    const supabase =
      await getSupabaseServer();

    /* =========================================================
       🔐 AUTH
    ========================================================= */

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {

      return {
        success: false,
        message: "Unauthorized",
      };
    }

    await validateSeller(
      user.id
    );

    /* =========================================================
       📝 FORM DATA
    ========================================================= */

    const name = String(
      formData.get("name") || ""
    ).trim();

    const description =
      String(
        formData.get(
          "description"
        ) || ""
      );

    const category_id =
      String(
        formData.get(
          "category_id"
        ) || ""
      );

    const variantsRaw =
      String(
        formData.get(
          "variants"
        ) || ""
      );

    /* =========================================================
       🚫 VALIDATION
    ========================================================= */

    if (
      !name ||
      !category_id ||
      !variantsRaw
    ) {

      return {
        success: false,
        message:
          "Missing fields",
      };
    }

    /* =========================================================
       📦 PARSE VARIANTS
    ========================================================= */

    let variants: any[] = [];

    try {

      variants =
        JSON.parse(
          variantsRaw
        );

    } catch {

      return {
        success: false,
        message:
          "Invalid variants",
      };
    }

    /* =========================================================
       📊 CATEGORY MARGIN
    ========================================================= */

    const {
      data: category,
    } = await supabase
      .from("categories")
      .select(
        "margin_percent"
      )
      .eq(
        "id",
        category_id
      )
      .single();

    const margin =
      Number(
        category
          ?.margin_percent || 25
      );

    /* =========================================================
       💰 CLEAN VARIANTS
    ========================================================= */

    const cleanVariants =
      variants
        .map((v) => {

          const cost_price =
            Number(
              v.cost_price || 0
            );

          if (
            cost_price <= 0
          ) {
            return null;
          }

          const pricing =
            calculatePrice({
              cost_price,

              margin_percent:
                margin,
            });

          return {

            cost_price,

            mrp: Number(
              v.mrp || 0
            ),

            stock: Number(
              v.stock || 0
            ),

            size:
              v.size || null,

            color:
              v.color
                ? String(
                    v.color
                  ).toLowerCase()
                : null,

            attributes: {
              size:
                v.size || null,

              color:
                v.color
                  ? String(
                      v.color
                    ).toLowerCase()
                  : null,
            },

            ...pricing,
          };
        })
        .filter(Boolean);

    /* =========================================================
       🚫 NO VARIANTS
    ========================================================= */

    if (
      !cleanVariants.length
    ) {

      return {
        success: false,
        message:
          "Invalid variants",
      };
    }

    /* =========================================================
       🖼 FILES
    ========================================================= */

    const files =
      formData.getAll(
        "images"
      ) as File[];

    if (!files.length) {

      return {
        success: false,
        message:
          "Upload images",
      };
    }

    /* =========================================================
       🖼 IMAGE META
    ========================================================= */

    /*
      FRONTEND FORMAT:

      [
        {
          color: "red"
        },
        {
          color: "green"
        }
      ]
    */

    let imagesMeta:
      any[] = [];

    try {

      imagesMeta =
        JSON.parse(
          String(
            formData.get(
              "imagesMeta"
            ) || "[]"
          )
        );

    } catch {

      imagesMeta = [];
    }

    /* =========================================================
       🖼 UPLOAD IMAGES
    ========================================================= */

    const imageUrls =
      await Promise.all(

        files.map(
          async (
            file
          ) => {

            const compressed =
              await compressImage(
                file
              );

            return uploadImage(
              compressed
            );
          }
        )
      );

    /* =========================================================
       📦 CREATE PRODUCT
    ========================================================= */

    const {
      data: product,
      error:
        productError,
    } = await supabase
      .from("products")
      .insert({

        name,

        description,

        slug:
          generateSlug(
            name
          ),

        seller_id:
          user.id,

        category_id,

        status:
          "active",

        approval_status:
          "pending",
      })
      .select()
      .single();

    if (
      productError ||
      !product
    ) {

      throw new Error(
        productError?.message ||
          "Failed to create product"
      );
    }

    /* =========================================================
       📦 INSERT VARIANTS
    ========================================================= */

    const {
      error:
        variantError,
    } = await supabase
      .from(
        "product_variants"
      )
      .insert(

        cleanVariants.map(
          (
            variant
          ) => ({

            product_id:
              product.id,

            ...variant,
          })
        )
      );

    if (
      variantError
    ) {

      console.error(
        "VARIANT ERROR:",
        variantError
      );

      throw new Error(
        variantError.message
      );
    }

    /* =========================================================
       🖼 INSERT IMAGES
    ========================================================= */

    const {
      error:
        imageError,
    } = await supabase
      .from(
        "product_images"
      )
      .insert(

        imageUrls.map(
          (
            url,
            index
          ) => {

            const meta =
              imagesMeta[
                index
              ] || {};

            return {

              product_id:
                product.id,

              url,

              is_primary:
                index === 0,

              /* 🔥 IMPORTANT */
              color:
                meta?.color
                  ? String(
                      meta.color
                    ).toLowerCase()
                  : null,
            };
          }
        )
      );

    if (
      imageError
    ) {

      console.error(
        "IMAGE ERROR:",
        imageError
      );

      throw new Error(
        imageError.message
      );
    }

    /* =========================================================
       ♻️ REVALIDATE
    ========================================================= */

    revalidatePath(
      "/dashboard/seller/products"
    );

    revalidatePath(
      "/"
    );

    /* =========================================================
       ✅ SUCCESS
    ========================================================= */

    return {
      success: true,
      message:
        "Product created successfully",
    };

  } catch (
    err: any
  ) {

    console.error(
      "CREATE PRODUCT ERROR:",
      err
    );

    return {

      success: false,

      message:
        err?.message ||
        "Failed to create product",
    };
  }
}

export async function updateProduct(
  formData: FormData
): Promise<ActionResponse> {

  try {

    const supabase =
      await getSupabaseServer();

    /* =========================================================
       🔐 AUTH
    ========================================================= */

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {

      return {
        success: false,
        message:
          "Unauthorized",
      };
    }

    /* =========================================================
       📦 PRODUCT ID
    ========================================================= */

    const id = String(
      formData.get(
        "product_id"
      ) || ""
    );

    if (!id) {

      return {
        success: false,
        message:
          "Product ID missing",
      };
    }

    /* =========================================================
       📦 PRODUCT
    ========================================================= */

    const {
      data: product,
    } = await supabase
      .from("products")
      .select(`
        seller_id
      `)
      .eq("id", id)
      .single();

    if (
      !product ||
      product.seller_id !==
        user.id
    ) {

      return {
        success: false,
        message:
          "Not allowed",
      };
    }

    /* =========================================================
       🧠 BASIC
    ========================================================= */

    const name = String(
      formData.get("name") ||
        ""
    );

    const description =
      String(
        formData.get(
          "description"
        ) || ""
      );

    const category_id =
      String(
        formData.get(
          "category_id"
        ) || ""
      );

    /* =========================================================
       📦 VARIANTS
    ========================================================= */

    const variants =
      JSON.parse(
        String(
          formData.get(
            "variants"
          ) || "[]"
        )
      );

    /* =========================================================
       📂 CATEGORY
    ========================================================= */

    const {
      data: category,
    } = await supabase
      .from("categories")
      .select(
        "margin_percent"
      )
      .eq(
        "id",
        category_id
      )
      .single();

    const margin =
      Number(
        category
          ?.margin_percent || 25
      );

    /* =========================================================
       ✅ CLEAN VARIANTS
    ========================================================= */

    const cleanVariants =
      variants
        .map((v: any) => {

          const cost_price =
            Number(
              v.cost_price || 0
            );

          if (
            cost_price <= 0
          ) {
            return null;
          }

          const pricing =
            calculatePrice({
              cost_price,

              margin_percent:
                margin,
            });

          return {

            product_id: id,

            size:
              v.size || null,

            color:
              v.color
                ? String(
                    v.color
                  ).toLowerCase()
                : null,

            attributes: {
              size:
                v.size || null,

              color:
                v.color
                  ? String(
                      v.color
                    ).toLowerCase()
                  : null,
            },

            cost_price,

            mrp: Number(
              v.mrp || 0
            ),

            stock: Number(
              v.stock || 0
            ),

            seller_profit:
              pricing.seller_profit,

            seller_price:
              pricing.selling_price,

            platform_margin:
              pricing.platform_margin,

            selling_price:
              pricing.selling_price,
          };
        })
        .filter(Boolean);

    /* =========================================================
       📦 UPDATE PRODUCT
    ========================================================= */

    const {
      error: productError,
    } = await supabase
      .from("products")
      .update({

        name,

        description,

        category_id,
      })
      .eq("id", id);

    if (
      productError
    ) {

      throw new Error(
        productError.message
      );
    }

    /* =========================================================
       🗑 DELETE OLD VARIANTS
    ========================================================= */

    await supabase
      .from(
        "product_variants"
      )
      .delete()
      .eq(
        "product_id",
        id
      );

    /* =========================================================
       ➕ INSERT NEW VARIANTS
    ========================================================= */

    if (
      cleanVariants.length
    ) {

      const {
        error:
          variantError,
      } = await supabase
        .from(
          "product_variants"
        )
        .insert(
          cleanVariants
        );

      if (
        variantError
      ) {

        throw new Error(
          variantError.message
        );
      }
    }

    /* =========================================================
       🖼 EXISTING IMAGES
    ========================================================= */

    const existingImages =
      JSON.parse(
        String(
          formData.get(
            "existingImages"
          ) || "[]"
        )
      );

    /* =========================================================
       🗑 DELETE OLD IMAGES
    ========================================================= */

    await supabase
      .from(
        "product_images"
      )
      .delete()
      .eq(
        "product_id",
        id
      );

    /* =========================================================
       ♻️ REINSERT EXISTING
    ========================================================= */

    if (
      existingImages.length
    ) {

      await supabase
        .from(
          "product_images"
        )
        .insert(

          existingImages.map(
            (
              img: any,
              index: number
            ) => ({

              product_id:
                id,

              url: img.url,

              color:
                img.color
                  ? String(
                      img.color
                    ).toLowerCase()
                  : null,

              is_primary:
                index === 0,
            })
          )
        );
    }

    /* =========================================================
       🖼 NEW IMAGES
    ========================================================= */

    const files =
      formData.getAll(
        "images"
      ) as File[];

    let imagesMeta: any[] =
      [];

    try {

      imagesMeta =
        JSON.parse(
          String(
            formData.get(
              "imagesMeta"
            ) || "[]"
          )
        );

    } catch {

      imagesMeta = [];
    }

    if (
      files.length > 0
    ) {

      const imageUrls =
        await Promise.all(

          files.map(
            async (
              file
            ) => {

              const compressed =
                await compressImage(
                  file
                );

              return uploadImage(
                compressed
              );
            }
          )
        );

      await supabase
        .from(
          "product_images"
        )
        .insert(

          imageUrls.map(
            (
              url,
              index
            ) => ({

              product_id:
                id,

              url,

              color:
                imagesMeta[
                  index
                ]?.color
                  ? String(
                      imagesMeta[
                        index
                      ].color
                    ).toLowerCase()
                  : null,

              is_primary:
                false,
            })
          )
        );
    }

    /* =========================================================
       ♻️ REVALIDATE
    ========================================================= */

    revalidatePath(
      "/dashboard/seller/products"
    );

    revalidatePath(
      `/product/${product.seller_id}`
    );

    /* =========================================================
       ✅ SUCCESS
    ========================================================= */

    return {

      success: true,

      message:
        "Product updated successfully",
    };

  } catch (
    err: any
  ) {

    console.error(
      "UPDATE ERROR:",
      err
    );

    return {

      success: false,

      message:
        err?.message ||
        "Failed to update product",
    };
  }
}
/* ============================= */
/* 🗑 DELETE */
/* ============================= */

export async function deleteProduct(id: string): Promise<ActionResponse> {
  const supabase = await getSupabaseServer();

  await supabase
    .from("products")
    .update({ status: "deleted" })
    .eq("id", id);

  return { success: true };
}

/* ============================= */
/* 📦 ORDER STATUS TYPES */
/* ============================= */

type OrderItemStatus =
  | "placed"
  | "accepted"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

type MainOrderStatus =
  | "placed"
  | "accepted"
  | "accepted"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/* ============================= */
/* 📦 ORDER STATUS */
/* ============================= */

export async function updateOrderStatus(
  orderItemId: string,
  newStatus: OrderItemStatus
): Promise<ActionResponse> {
  try {
    const supabase =
      await getSupabaseServer();

    /* ============================= */
    /* 🔐 AUTH */
    /* ============================= */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    /* ============================= */
    /* ✅ SELLER ALLOWED STATUSES */
    /* ============================= */

    const allowedStatuses: OrderItemStatus[] =
      [
        "accepted",
        "cancelled",
      ];

    if (
      !allowedStatuses.includes(
        newStatus
      )
    ) {
      return {
        success: false,
        message:
          "Seller cannot update this status",
      };
    }

    /* ============================= */
    /* 📦 FETCH ORDER ITEM */
    /* ============================= */

    const {
      data: item,
      error: fetchError,
    } = await supabaseAdmin
      .from("order_items")
      .select(`
        id,
        order_id,
        seller_id,
        status
      `)
      .eq("id", orderItemId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "FETCH ITEM ERROR:",
        fetchError
      );

      return {
        success: false,
        message:
          "Failed to fetch order item",
      };
    }

    if (!item) {
      return {
        success: false,
        message:
          "Order item not found",
      };
    }

    /* ============================= */
    /* 🔐 OWNERSHIP CHECK */
    /* ============================= */

    if (
      item.seller_id !== user.id
    ) {
      console.error({
        authUser: user.id,
        itemSeller:
          item.seller_id,
      });

      return {
        success: false,
        message:
          "You cannot update this order",
      };
    }

    /* ============================= */
    /* 🚫 STATUS FLOW VALIDATION */
    /* ============================= */

    const currentStatus =
      item.status as OrderItemStatus;

    const validTransitions: Record<
      OrderItemStatus,
      OrderItemStatus[]
    > = {
      placed: [
        "accepted",
        "cancelled",
      ],

      accepted: [],

      processing: [],

      shipped: [],

      out_for_delivery: [],

      delivered: [],

      cancelled: [],
    };

    if (
      !validTransitions[
        currentStatus
      ]?.includes(newStatus)
    ) {
      return {
        success: false,
        message: `Cannot change order from ${currentStatus} to ${newStatus}`,
      };
    }

    /* ============================= */
    /* 🧠 UPDATE DATA */
    /* ============================= */

    const now =
      new Date().toISOString();

    const updateData: any = {
      status: newStatus,
    };

    /* ============================= */
    /* 🕒 TIMESTAMPS */
    /* ============================= */

    switch (newStatus) {
      case "accepted":
        updateData.accepted_at =
          now;
        break;

      case "cancelled":
        updateData.cancelled_at =
          now;
        break;
    }

    /* ============================= */
    /* ✅ UPDATE ORDER ITEM */
    /* ============================= */

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("order_items")
      .update(updateData)
      .eq("id", orderItemId);

    if (updateError) {
      console.error(
        "UPDATE ITEM ERROR:",
        updateError
      );

      return {
        success: false,
        message:
          updateError.message,
      };
    }

    /* ============================= */
    /* 🔄 SYNC MAIN ORDER */
    /* ============================= */

    await syncMainOrderStatus(
      item.order_id
    );

    /* ============================= */
    /* 🧾 GENERATE INVOICE */
    /* ============================= */

    if (
      newStatus === "accepted"
    ) {
      try {
        await generateSellerInvoice(
          item.order_id
        );
      } catch (invoiceError) {
        console.error(
          "INVOICE ERROR:",
          invoiceError
        );
      }
    }

    /* ============================= */
    /* ♻️ REVALIDATE */
    /* ============================= */

    revalidatePath(
      "/dashboard/seller/orders"
    );

    revalidatePath(
      "/dashboard/user/orders"
    );

    revalidatePath(
      "/dashboard/admin/orders"
    );

    /* ============================= */
    /* ✅ SUCCESS */
    /* ============================= */

    return {
      success: true,
      message:
        "Order updated successfully",
    };
  } catch (err: any) {
    console.error(
      "ORDER STATUS ERROR:",
      err
    );

    return {
      success: false,
      message:
        err?.message ||
        "Failed to update order",
    };
  }
}

/* ============================= */
/* 🔄 SYNC MAIN ORDER STATUS */
/* ============================= */



async function syncMainOrderStatus(
  orderId: string
): Promise<void> {
  try {
    /* ============================= */
    /* 📦 FETCH ORDER ITEMS */
    /* ============================= */

    const {
      data: items,
      error,
    } = await supabaseAdmin
      .from("order_items")
      .select("status")
      .eq("order_id", orderId);

    if (error) {
      console.error(
        "FETCH ORDER ITEMS ERROR:",
        error
      );

      return;
    }

    if (!items?.length) {
      return;
    }

    /* ============================= */
    /* 🧠 ALL ITEM STATUSES */
    /* ============================= */

    const statuses =
      items.map(
        (item) => item.status
      ) || [];

    /* ============================= */
    /* 🎯 DEFAULT STATUS */
    /* ============================= */

    let orderStatus:
      | "placed"
      | "accepted"
      | "processing"
      | "shipped"
      | "out_for_delivery"
      | "delivered"
      | "cancelled" =
      "placed";

    /* ============================= */
    /* ✅ ALL DELIVERED */
    /* ============================= */

    if (
      statuses.every(
        (status) =>
          status ===
          "delivered"
      )
    ) {
      orderStatus =
        "delivered";
    }

    /* ============================= */
    /* 🚚 OUT FOR DELIVERY */
    /* ============================= */

    else if (
      statuses.some(
        (status) =>
          status ===
          "out_for_delivery"
      )
    ) {
      orderStatus =
        "out_for_delivery";
    }

    /* ============================= */
    /* 🚛 SHIPPED */
    /* ============================= */

    else if (
      statuses.some(
        (status) =>
          status ===
          "shipped"
      )
    ) {
      orderStatus =
        "shipped";
    }

    /* ============================= */
    /* ✅ ACCEPTED */
    /* ============================= */

    else if (
      statuses.some(
        (status) =>
          status ===
          "accepted"
      )
    ) {
      orderStatus =
        "accepted";
    }

    /* ============================= */
    /* 📦 PROCESSING */
    /* ============================= */

    else if (
      statuses.some(
        (status) =>
          status ===
          "processing"
      )
    ) {
      orderStatus =
        "processing";
    }

    /* ============================= */
    /* ❌ ALL CANCELLED */
    /* ============================= */

    else if (
      statuses.every(
        (status) =>
          status ===
          "cancelled"
      )
    ) {
      orderStatus =
        "cancelled";
    }

    /* ============================= */
    /* 🟢 DEFAULT PLACED */
    /* ============================= */

    else if (
      statuses.every(
        (status) =>
          status ===
          "placed"
      )
    ) {
      orderStatus =
        "placed";
    }

    /* ============================= */
    /* ✅ UPDATE MAIN ORDER */
    /* ============================= */

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        status: orderStatus,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error(
        "SYNC STATUS UPDATE ERROR:",
        updateError
      );
    }
  } catch (err) {
    console.error(
      "SYNC MAIN ORDER ERROR:",
      err
    );
  }
}

export async function acceptOrder(
  orderId: string
): Promise<ActionResponse> {
  try {
    const supabase =
      await getSupabaseServer();

    /* ============================= */
    /* 🔐 AUTH */
    /* ============================= */

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    /* ============================= */
    /* 📦 FETCH ORDER */
    /* ============================= */

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(
        "ORDER ERROR:",
        orderError
      );

      return {
        success: false,
        message: "Order not found",
      };
    }

    /* ============================= */
    /* 🔐 SELLER VALIDATION */
    /* ============================= */

    if (
      order.seller_id !== user.id
    ) {
      return {
        success: false,
        message:
          "Unauthorized seller",
      };
    }

    /* ============================= */
    /* 🚫 VALID STATUS */
    /* ============================= */

    if (
      order.status !== "placed"
    ) {
      return {
        success: false,
        message:
          "Order already processed",
      };
    }

    /* ============================= */
    /* 🕒 TIME */
    /* ============================= */

    const now =
      new Date().toISOString();

    /* ============================= */
    /* ✅ UPDATE ORDER */
    /* ============================= */

    const {
      error: orderUpdateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        status:
          "processing",

        processing_at:
          now,
      })
      .eq("id", orderId);

    if (
      orderUpdateError
    ) {
      console.error(
        "ORDER UPDATE ERROR:",
        orderUpdateError
      );

      return {
        success: false,
        message:
          orderUpdateError.message,
      };
    }

    /* ============================= */
    /* ✅ UPDATE ITEMS */
    /* ============================= */

    const {
      error:
        itemsUpdateError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        status:
          "processing",

        processing_at:
          now,
      })
      .eq(
        "order_id",
        orderId
      );

    if (
      itemsUpdateError
    ) {
      console.error(
        "ITEMS UPDATE ERROR:",
        itemsUpdateError
      );

      return {
        success: false,
        message:
          itemsUpdateError.message,
      };
    }

    /* ============================= */
    /* 🚚 AUTO CREATE SHIPMENT */
    /* ============================= */

    try {
      await createShipmentForOrder(
        orderId
      );
    } catch (
      shipmentError: any
    ) {
      console.error(
        "SHIPMENT ERROR:",
        shipmentError
      );

      return {
        success: false,
        message:
          shipmentError?.message ||
          "Shipment creation failed",
      };
    }

    /* ============================= */
    /* 🧾 GENERATE INVOICE */
    /* ============================= */

    try {
      await generateSellerInvoice(
        orderId
      );
    } catch (
      invoiceError
    ) {
      console.error(
        "INVOICE ERROR:",
        invoiceError
      );
    }

    /* ============================= */
    /* ♻️ REVALIDATE */
    /* ============================= */

    revalidatePath(
      "/dashboard/seller/orders"
    );

    revalidatePath(
      "/dashboard/user/orders"
    );

    revalidatePath(
      "/dashboard/admin/orders"
    );

    /* ============================= */
    /* ✅ SUCCESS */
    /* ============================= */

    return {
      success: true,

      message:
        "Order accepted and shipment created successfully",
    };
  } catch (error: any) {
    console.error(
      "ACCEPT ORDER ERROR:",
      error
    );

    return {
      success: false,

      message:
        error?.message ||
        "Failed to accept order",
    };
  }
}

