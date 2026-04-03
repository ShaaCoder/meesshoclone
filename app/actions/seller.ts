"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { generateInvoices } from "./invoice";
import { redirect } from "next/navigation";
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
  /* 🧾 GET ORDER */
  /* ============================= */
  const { data: existingOrder, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !existingOrder) {
    throw new Error("Order not found");
  }

  /* 🚫 PREVENT DOUBLE PAYOUT */
  if (
    existingOrder.status === "delivered" &&
    existingOrder.seller_payout > 0
  ) {
    return;
  }

  /* ============================= */
  /* 🔄 UPDATE STATUS */
  /* ============================= */
  const { data: order, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError || !order) {
    throw new Error("Update failed");
  }

  /* ============================= */
  /* 💰 PAYOUT + INVOICE LOGIC */
  /* ============================= */
  if (status === "delivered") {
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (!items || items.length === 0) return;

    /* ============================= */
    /* 💵 CALCULATIONS */
    /* ============================= */
    const baseTotal = items.reduce((sum, item) => {
      return sum + Number(item.base_price) * Number(item.quantity);
    }, 0);

    const sellingTotal = items.reduce((sum, item) => {
      return sum + Number(item.selling_price) * Number(item.quantity);
    }, 0);

    const margin = sellingTotal - baseTotal;

    if (baseTotal <= 0) return;

    const sellerId = order.seller_id;       // ✅ FIXED
    const resellerId = order.reseller_id;

    /* ============================= */
    /* 💰 SELLER WALLET */
    /* ============================= */
    const { error: sellerWalletError } = await supabase.rpc(
      "increment_wallet",
      {
        user_id: sellerId,
        amount: baseTotal,
      }
    );

    if (sellerWalletError) {
      throw new Error("Seller payout failed");
    }

    /* ============================= */
    /* 💰 RESELLER WALLET */
    /* ============================= */
    if (margin > 0 && resellerId) {
      await supabase.rpc("increment_wallet", {
        user_id: resellerId,
        amount: margin,
      });

      await supabase.from("transactions").insert({
        reseller_id: resellerId,
        amount: margin,
        type: "credit",
        status: "completed",
      });
    }

    /* ============================= */
    /* 📜 SELLER TRANSACTION */
    /* ============================= */
    await supabase.from("transactions").insert({
      reseller_id: sellerId,
      amount: baseTotal,
      type: "credit",
      status: "completed",
    });

    /* ============================= */
    /* 🧾 GENERATE INVOICES */
    /* ============================= */
    // const { generateInvoices } = await import("@/actions/invoice");

    await generateInvoices({
      id: orderId,
      user_id: order.user_id,
      seller_id: sellerId,
      reseller_id: resellerId,
      base_price: baseTotal,
      selling_price: sellingTotal,
      margin,
    });

    /* ============================= */
    /* 💾 SAVE PAYOUT */
    /* ============================= */
    await supabase
      .from("orders")
      .update({
        seller_payout: baseTotal,
      })
      .eq("id", orderId);

    console.log("✅ SELLER PAID:", baseTotal);
    console.log("✅ RESELLER EARNED:", margin);
  }
}