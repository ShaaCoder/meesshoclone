"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
// import { generateInvoices } from "./invoice";
import { redirect } from "next/navigation";
import { generateSellerInvoice } from "./invoice";
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
  /* 📦 BASIC DATA */
  /* ============================= */
  const name = formData.get("name") as string;
  const base_price = Number(formData.get("base_price"));
  const selling_price = Number(formData.get("selling_price"));
  const image = formData.get("image") as string;
  const description = formData.get("description") as string;
  const category_id = formData.get("category_id") as string;
  const stock = Number(formData.get("stock"));

  /* ============================= */
  /* 🛑 VALIDATION */
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
  /* 🔗 SEO */
  /* ============================= */
  const slug =
    name.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(Math.random() * 1000);

  const meta_title = `${name} | Buy Online`;
  const meta_description = description?.slice(0, 150);

  /* ============================= */
  /* 📥 CREATE PRODUCT */
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
      meta_title,
      meta_description,
      status: "pending",
    })
    .select()
    .single();

  if (error || !product) {
    throw new Error("Product creation failed");
  }

  /* ============================= */
  /* 🔥 SAVE ATTRIBUTES */
  /* ============================= */
  const attributeInserts: any[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("attr_") && value) {
      attributeInserts.push({
        product_id: product.id,
        attribute_id: key.replace("attr_", ""),
        value: value as string,
      });
    }
  }

  if (attributeInserts.length > 0) {
    await supabase.from("product_attributes").insert(attributeInserts);
  }

  /* ============================= */
  /* 🔥 VARIANTS SYSTEM */
  /* ============================= */
  const sizes = (formData.get("sizes") as string)?.split(",").map(s => s.trim()).filter(Boolean);
  const colors = (formData.get("colors") as string)?.split(",").map(c => c.trim()).filter(Boolean);

  const variant_price =
    Number(formData.get("variant_price")) ||
    selling_price ||
    base_price;

  const variant_stock =
    Number(formData.get("variant_stock")) || 0;

  const variants: any[] = [];

  if (sizes?.length && colors?.length) {
    for (const size of sizes) {
      for (const color of colors) {
        variants.push({
          product_id: product.id,
          size,
          color,
          price: variant_price,
          stock: variant_stock,
        });
      }
    }
  }

  if (variants.length > 0) {
    await supabase.from("product_variants").insert(variants);
  }

  /* ============================= */
  /* 🔄 REDIRECT */
  /* ============================= */
  redirect("/dashboard/seller/products");
}

/* ============================= */
/* ✏️ UPDATE PRODUCT */
/* ============================= */
export async function updateProduct(formData: FormData) {
  const supabase = await getSupabaseServer();

  const id = formData.get("id") as string;

  const name = formData.get("name") as string;
  const base_price = Number(formData.get("base_price"));
  const selling_price = Number(formData.get("selling_price"));
  const image = formData.get("image") as string;
  const description = formData.get("description") as string;
  const category_id = formData.get("category_id") as string;
  const stock = Number(formData.get("stock"));

  if (!id) throw new Error("Product ID missing");

  if (selling_price && selling_price < base_price) {
    throw new Error("Selling price must be ≥ base price");
  }

  const meta_title = `${name} | Buy Online`;
  const meta_description = description?.slice(0, 150);

  await supabase
    .from("products")
    .update({
      name,
      base_price,
      selling_price,
      image,
      description,
      category_id,
      stock,
      meta_title,
      meta_description,
    })
    .eq("id", id);
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

  /* ============================= */
  /* 👤 GET USER */
  /* ============================= */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  /* ============================= */
  /* 🚫 SELLER PERMISSION */
  /* ============================= */
  if (user.role === "seller") {
    if (!["accepted", "rejected"].includes(status)) {
      throw new Error("Not allowed");
    }
  }

  /* ============================= */
  /* 🧾 GET ORDER */
  /* ============================= */
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  /* ============================= */
  /* 🔄 UPDATE STATUS */
  /* ============================= */
  const updateData: any = { status };

  if (status === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (updateError) {
    console.error("❌ STATUS UPDATE ERROR:", updateError);
    throw new Error("Update failed");
  }

  console.log("🔥 STATUS UPDATED:", status);

  /* ============================= */
  /* 🧾 GENERATE INVOICE */
  /* ============================= */
  if (status === "accepted") {
    console.log("🚀 START INVOICE GENERATION");

    try {
      const url = await generateSellerInvoice(orderId);
      console.log("✅ INVOICE CREATED:", url);
    } catch (err) {
      console.error("❌ INVOICE FAILED:", err);
    }
  }

  /* ============================= */
  /* 💰 PAYOUT (ADMIN ONLY) */
  /* ============================= */
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
      const sellerId = item.seller_id;

      const base =
        Number(item.base_price || 0) * Number(item.quantity || 1);

      const selling =
        Number(item.selling_price || 0) * Number(item.quantity || 1);

      sellingTotal += selling;

      if (!sellerId) return;

      sellerMap[sellerId] = (sellerMap[sellerId] || 0) + base;
    });

    const baseTotal = Object.values(sellerMap).reduce(
      (a, b) => a + b,
      0
    );

    const margin = sellingTotal - baseTotal;

    /* PAY SELLERS */
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

    /* RESELLER PROFIT */
    if (margin > 0 && order.reseller_id) {
      const resellerId = order.reseller_id;

      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("reseller_id", resellerId)
        .maybeSingle();

      if (!wallet) {
        await supabase.from("wallets").insert({
          reseller_id: resellerId,
          balance: margin,
        });
      } else {
        await supabase
          .from("wallets")
          .update({
            balance: Number(wallet.balance || 0) + margin,
          })
          .eq("reseller_id", resellerId);
      }

      await supabase.from("transactions").insert({
        reseller_id: resellerId,
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

    console.log("✅ PAYOUT DONE");
  }
}