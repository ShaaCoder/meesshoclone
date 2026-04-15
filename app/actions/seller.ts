"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { generateSellerInvoice } from "./invoice";

/* ============================= */
/* 🧠 HELPERS */
/* ============================= */
type ActionResponse = {
  success: boolean;
  message?: string;
};
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
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Invalid image");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const compressed = await sharp(buffer)
      .resize(800)
      .jpeg({ quality: 70 })
      .toBuffer();

    return new File([new Uint8Array(compressed)], file.name, {
      type: "image/jpeg",
    });
  } catch (err) {
    console.error("❌ Compression error:", err);
    return file;
  }
}

async function uploadImage(file: File) {
  const supabase = await getSupabaseServer();

  const fileName = `${Date.now()}-${Math.random()}-${file.name}`;

  const { error } = await supabase.storage
    .from("products")
    .upload(fileName, file);

  if (error) {
    console.error("❌ Upload error:", error);
    throw new Error("Image upload failed");
  }

  const { data } = supabase.storage
    .from("products")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/* ============================= */
/* 📂 CATALOG */
/* ============================= */

async function createCatalog(category_id: string, title: string, seller_id: string) {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("catalogs")
    .insert({
      category_id,
      title,
      seller_id,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* ============================= */
/* 🚀 CREATE PRODUCT */
/* ============================= */

export async function createProduct(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    await validateSeller(user.id);

    const name = String(formData.get("name") || "").trim();
    const category_id = String(formData.get("category_id") || "");
    const variantsRaw = String(formData.get("variants") || "");

    if (!name || !category_id || !variantsRaw) {
      return { success: false, message: "Please fill all required fields" };
    }

    let variants: any[] = [];

    try {
      variants = JSON.parse(variantsRaw);
    } catch {
      return { success: false, message: "Invalid variants format" };
    }

    const cleanVariants = variants
      .map((v) => {
        const basePrice = Number(v.price || 0);

        return {
          price: basePrice,
          cost_price: basePrice,
          platform_margin: 0,
          mrp: Number(v.mrp || 0),
          stock: Number(v.stock || 0),
          size: v.size || null,
          color: v.color || null,
        };
      })
      .filter((v) => v.price > 0 && v.stock > 0);

    if (!cleanVariants.length) {
      return { success: false, message: "Add valid variants with price & stock" };
    }

    const rawFiles = formData.getAll("images");

    const files = rawFiles
      .filter((f: any) => f instanceof File)
      .filter((f: File) => f.size > 0 && f.type.startsWith("image/"));

    if (!files.length) {
      return { success: false, message: "Upload at least one image" };
    }

    /* upload */
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file);
        return uploadImage(compressed);
      })
    );

    const catalog = await createCatalog(category_id, name, user.id);

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name,
        seller_id: user.id,
        category_id,
        catalog_id: catalog.id,
        image: imageUrls[0],
        slug: generateSlug(name),
        status: "pending",
      })
      .select()
      .single();

    if (!product || error) {
      return { success: false, message: "Product creation failed" };
    }

    await supabase.from("product_variants").insert(
      cleanVariants.map((v) => ({
        product_id: product.id,
        ...v,
      }))
    );

    await supabase.from("product_images").insert(
      imageUrls.map((url, i) => ({
        product_id: product.id,
        url,
        is_primary: i === 0,
      }))
    );

    return { success: true };
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return { success: false, message: "Something went wrong" };
  }
}

/* ============================= */
/* ✏️ UPDATE PRODUCT */
/* ============================= */

export async function updateProduct(formData: FormData): Promise<ActionResponse> {
  const supabase = await getSupabaseServer();

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing ID");

  const name = String(formData.get("name") || "");
  const description = String(formData.get("description") || "");
  const category_id = String(formData.get("category_id") || "");

  const variantsRaw = String(formData.get("variants") || "[]");
  let variants: any[] = JSON.parse(variantsRaw);

  /* ============================= */
  /* 🔥 FIXED UPDATE VARIANTS */
  /* ============================= */
  const cleanVariants = variants
    .map((v) => {
      const basePrice = Number(v.price || 0);

      return {
        price: basePrice, // ✅ FIX
        cost_price: basePrice,
        platform_margin: Number(v.platform_margin || 0),
        stock: Number(v.stock || 0),
        size: v.size || null,
        color: v.color || null,
      };
    })
    .filter((v) => v.price > 0);

  await supabase
    .from("products")
    .update({ name, description, category_id })
    .eq("id", id);

  await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", id);

  await supabase.from("product_variants").insert(
    cleanVariants.map((v) => ({
      product_id: id,
      ...v,
    }))
  );

  redirect("/dashboard/seller/products");
}

/* ============================= */
/* 🗑 DELETE */
/* ============================= */

export async function deleteProduct(id: string) : Promise<ActionResponse> {
  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from("products")
    .update({
      status: "deleted",
    })
    .eq("id", id);

  if (error) {
    console.error("DELETE ERROR:", error);
    throw new Error("Delete failed");
  }

  // no reload needed, redirect handles refresh
  redirect("/dashboard/seller/products");
}
/* ============================= */
/* 📦 ORDER STATUS */
/* ============================= */

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  /* ============================= */
  /* 🔐 CHECK SELLER */
  /* ============================= */
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "seller") {
    throw new Error("Only seller allowed");
  }

  /* ============================= */
  /* 📦 GET ORDER */
  /* ============================= */
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");

  /* ============================= */
  /* 🚨 BLOCK DELIVERED */
  /* ============================= */
  if (status === "delivered") {
    throw new Error("Seller cannot mark as delivered");
  }

  /* ============================= */
  /* ✅ ALLOWED STATUS */
  /* ============================= */
  const allowed = ["accepted", "processing", "ready_to_ship"];

  if (!allowed.includes(status)) {
    throw new Error("Invalid status");
  }

  /* ============================= */
  /* 🔄 UPDATE */
  /* ============================= */
  await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("id", orderId);

  /* ============================= */
  /* 🧾 INVOICE */
  /* ============================= */
  if (status === "accepted") {
    await generateSellerInvoice(orderId);
  }
}