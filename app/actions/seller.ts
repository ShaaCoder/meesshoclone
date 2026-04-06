"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { generateSellerInvoice } from "./invoice";
import sharp from "sharp";




async function compressImage(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const compressedBuffer = await sharp(buffer)
    .resize(800)
    .jpeg({ quality: 70 })
    .toBuffer();

  // ✅ FIX: convert Buffer → Uint8Array
  const uint8Array = new Uint8Array(compressedBuffer);

  return new File([uint8Array], file.name, {
    type: "image/jpeg",
  });
}

/* ============================= */
/* 📦 IMAGE UPLOAD HELPER */
/* ============================= */
async function uploadImage(file: File) {
  const supabase = await getSupabaseServer();

  const fileName = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("products")
    .upload(fileName, file);

  if (error) {
    console.error("❌ IMAGE UPLOAD ERROR:", error);
    throw new Error("Image upload failed");
  }

  const { data } = supabase.storage
    .from("products")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/* ============================= */
/* 📦 CREATE PRODUCT */
/* ============================= */
export async function createProduct(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  /* ============================= */
  /* 🧾 BASIC FIELDS */
  /* ============================= */
  const name = formData.get("name") as string;
  const base_price = Number(formData.get("base_price"));
  const selling_price = Number(formData.get("selling_price"));
  const description = formData.get("description") as string;
  const category_id = formData.get("category_id") as string;
  const stock = Number(formData.get("stock"));

  /* ============================= */
  /* 🏭 EXTRA PRODUCT FIELDS */
  /* ============================= */
  const gst_percent = Number(formData.get("gst_percent") || 0);
  const hsn_code = formData.get("hsn_code") as string;

  const manufacturer_name = formData.get("manufacturer_name") as string;
  const manufacturer_address = formData.get("manufacturer_address") as string;
  const manufacturer_pincode = formData.get("manufacturer_pincode") as string;

  const packer_name = formData.get("packer_name") as string;
  const packer_address = formData.get("packer_address") as string;
  const packer_pincode = formData.get("packer_pincode") as string;

  const importer_name = formData.get("importer_name") as string;
  const importer_address = formData.get("importer_address") as string;
  const importer_pincode = formData.get("importer_pincode") as string;

  const country_of_origin = formData.get("country_of_origin") as string;

  const tagsRaw = formData.get("tags") as string; // comma separated
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()) : [];

  /* ============================= */
  /* VALIDATIONS */
  /* ============================= */
  if (!name || !base_price || !category_id) {
    throw new Error("Missing required fields");
  }

  if (selling_price && selling_price < base_price) {
    throw new Error("Selling price must be ≥ base price");
  }

  if (stock < 0) {
    throw new Error("Stock cannot be negative");
  }

  /* ============================= */
  /* 📸 FILE UPLOAD */
  /* ============================= */
  const files = (formData.getAll("images") as File[])
    .filter((f) => f && f.size > 0);

  if (files.length === 0) {
    throw new Error("At least 1 image is required");
  }

  if (files.length > 5) {
    throw new Error("Maximum 5 images allowed");
  }

  const uploadPromises = files.map(async (file) => {
    const compressed = await compressImage(file);
    return await uploadImage(compressed);
  });

  const urls = await Promise.all(uploadPromises);

  const image = urls[0];

  /* ============================= */
  /* 🧠 SLUG */
  /* ============================= */
  const slug =
    name.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(Math.random() * 1000);

  /* ============================= */
  /* 🚀 INSERT PRODUCT */
  /* ============================= */
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name,
      base_price,
      selling_price,
      image,
      description,
      category_id,
      stock,
      seller_id: user.id,
      slug,
      status: "pending",

      meta_title: `${name} | Buy Online`,
      meta_description: description?.slice(0, 150),

      /* ✅ NEW FIELDS */
      gst_percent,
      hsn_code,

      manufacturer_name,
      manufacturer_address,
      manufacturer_pincode,

      packer_name,
      packer_address,
      packer_pincode,

      importer_name,
      importer_address,
      importer_pincode,

      country_of_origin,
      tags,
    })
    .select()
    .single();

  if (error || !product) throw new Error("Product creation failed");

  /* ============================= */
  /* 🖼 SAVE IMAGES */
  /* ============================= */
  const imageRows = urls.map((url) => ({
    product_id: product.id,
    url,
  }));

  const { error: imgError } = await supabase
    .from("product_images")
    .insert(imageRows);

  if (imgError) throw new Error("Image DB insert failed");

  redirect("/dashboard/seller/products");
}
/* ============================= */
/* ✏️ UPDATE PRODUCT */
/* ============================= */
export async function updateProduct(formData: FormData) {
  const supabase = await getSupabaseServer();

  const id = formData.get("id") as string;
  if (!id) throw new Error("Product ID missing");

  const name = formData.get("name") as string;
  const base_price = Number(formData.get("base_price"));
  const selling_price = Number(formData.get("selling_price"));
  const description = formData.get("description") as string;
  const category_id = formData.get("category_id") as string;
  const stock = Number(formData.get("stock"));

  /* ✅ NEW FIELDS */
  const gst_percent = Number(formData.get("gst_percent") || 0);
  const hsn_code = formData.get("hsn_code") as string;

  const manufacturer_name = formData.get("manufacturer_name") as string;
  const manufacturer_address = formData.get("manufacturer_address") as string;
  const manufacturer_pincode = formData.get("manufacturer_pincode") as string;

  const packer_name = formData.get("packer_name") as string;
  const packer_address = formData.get("packer_address") as string;
  const packer_pincode = formData.get("packer_pincode") as string;

  const importer_name = formData.get("importer_name") as string;
  const importer_address = formData.get("importer_address") as string;
  const importer_pincode = formData.get("importer_pincode") as string;

  const country_of_origin = formData.get("country_of_origin") as string;

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()) : [];

  if (selling_price && selling_price < base_price) {
    throw new Error("Selling price must be ≥ base price");
  }

  let updateData: any = {
    name,
    base_price,
    selling_price,
    description,
    category_id,
    stock,

    meta_title: `${name} | Buy Online`,
    meta_description: description?.slice(0, 150),

    /* ✅ NEW */
    gst_percent,
    hsn_code,

    manufacturer_name,
    manufacturer_address,
    manufacturer_pincode,

    packer_name,
    packer_address,
    packer_pincode,

    importer_name,
    importer_address,
    importer_pincode,

    country_of_origin,
    tags,
  };

  /* ============================= */
  /* 📸 IMAGE HANDLING */
  /* ============================= */
  const files = (formData.getAll("images") as File[])
    .filter((f) => f && f.size > 0);

  const { data: existingImages } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", id);

  const existingCount = existingImages?.length || 0;

  if (existingCount + files.length > 5) {
    throw new Error("Max 5 images allowed");
  }

  if (files.length > 0) {
    const uploadPromises = files.map(async (file) => {
      const compressed = await compressImage(file);
      return await uploadImage(compressed);
    });

    const urls = await Promise.all(uploadPromises);

    const imageRows = urls.map((url) => ({
      product_id: id,
      url,
    }));

    await supabase.from("product_images").insert(imageRows);

    updateData.image = urls[0];
  }

  await supabase.from("products").update(updateData).eq("id", id);

  redirect("/dashboard/seller/products");
}

/* ============================= */
/* 🗑 DELETE PRODUCT */
/* ============================= */
export async function deleteProduct(id: string) {
  const supabase = await getSupabaseServer();
  await supabase.from("products").delete().eq("id", id);
}

/* ============================= */
/* 🔥 UPDATE ORDER STATUS */
/* ============================= */
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (user.role === "seller") {
    if (!["accepted", "rejected"].includes(status)) {
      throw new Error("Not allowed");
    }
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  const updateData: any = { status };

  if (status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (updateError) {
    console.error(updateError);
    throw new Error("Update failed");
  }

  if (status === "accepted") {
    try {
      await generateSellerInvoice(orderId);
    } catch (err) {
      console.error("Invoice error:", err);
    }
  }

  if (status === "delivered" && user.role !== "seller") {
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (!items || items.length === 0) {
      throw new Error("Order items not found");
    }

    const sellerMap: Record<string, number> = {};
    let sellingTotal = 0;

    items.forEach((item) => {
      const base =
        Number(item.base_price || 0) * Number(item.quantity || 1);

      const selling =
        Number(item.selling_price || 0) * Number(item.quantity || 1);

      sellingTotal += selling;

      if (!item.seller_id) return;

      sellerMap[item.seller_id] =
        (sellerMap[item.seller_id] || 0) + base;
    });

    const baseTotal = Object.values(sellerMap).reduce(
      (a, b) => a + b,
      0
    );

    const margin = sellingTotal - baseTotal;

    for (const sellerId of Object.keys(sellerMap)) {
      const payout = sellerMap[sellerId];

      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("reseller_id", sellerId)
        .maybeSingle();

      if (!wallet) {
        await supabase.from("wallets").insert({
          reseller_id: sellerId,
          balance: payout,
        });
      } else {
        await supabase
          .from("wallets")
          .update({
            balance: Number(wallet.balance || 0) + payout,
          })
          .eq("reseller_id", sellerId);
      }

      await supabase.from("transactions").insert({
        reseller_id: sellerId,
        amount: payout,
        type: "credit",
      });
    }

    if (margin > 0 && order.reseller_id) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("reseller_id", order.reseller_id)
        .maybeSingle();

      if (!wallet) {
        await supabase.from("wallets").insert({
          reseller_id: order.reseller_id,
          balance: margin,
        });
      } else {
        await supabase
          .from("wallets")
          .update({
            balance: Number(wallet.balance || 0) + margin,
          })
          .eq("reseller_id", order.reseller_id);
      }

      await supabase.from("transactions").insert({
        reseller_id: order.reseller_id,
        amount: margin,
        type: "credit",
      });
    }

    await supabase
      .from("orders")
      .update({
        seller_paid: true,
        seller_payout: baseTotal,
      })
      .eq("id", orderId);
  }
}