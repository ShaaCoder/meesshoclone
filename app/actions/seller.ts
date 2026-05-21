"use server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import sharp from "sharp";
import { generateSellerInvoice } from "./invoice";
import { calculatePrice } from "@/lib/pricing";
import { revalidatePath } from "next/cache";
import {
  createShipment,
  getSellerPickupAddress,
} from "@/services/shiprocket";

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
/* ➕ CREATE PRODUCT */
/* ============================= */

export async function createProduct(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Unauthorized" };

    await validateSeller(user.id);

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "");
    const category_id = String(formData.get("category_id") || "");
    const variantsRaw = String(formData.get("variants") || "");

    if (!name || !category_id || !variantsRaw) {
      return { success: false, message: "Missing fields" };
    }

    let variants: any[] = JSON.parse(variantsRaw);

    /* 🔥 GET CATEGORY MARGIN */
    const { data: category } = await supabase
      .from("categories")
      .select("margin_percent")
      .eq("id", category_id)
      .single();

    const margin = Number(category?.margin_percent || 25);

    /* ✅ CLEAN + APPLY PRICING */
    const cleanVariants = variants
      .map((v) => {
        const cost_price = Number(v.cost_price || 0);

        if (cost_price <= 0) return null;

        const pricing = calculatePrice({
          cost_price,
          margin_percent: margin,
        });

        return {
          cost_price,
          mrp: Number(v.mrp || 0),
          stock: Number(v.stock || 0),
          size: v.size || null,
          color: v.color || null,
          ...pricing,
        };
      })
      .filter(Boolean);

    if (!cleanVariants.length) {
      return { success: false, message: "Invalid variants" };
    }

    /* 🖼 IMAGES */
    const files = formData.getAll("images") as File[];

    if (!files.length) {
      return { success: false, message: "Upload images" };
    }

    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file);
        return uploadImage(compressed);
      })
    );

    /* 📦 PRODUCT */
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name,
        description,
        slug: generateSlug(name),
        seller_id: user.id,
        category_id,
        status: "active",
        approval_status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    /* 🔁 VARIANTS */
    await supabase.from("product_variants").insert(
      cleanVariants.map((v) => ({
        product_id: product.id,
        ...v,
      }))
    );

    /* 🖼 IMAGES */
    await supabase.from("product_images").insert(
      imageUrls.map((url, i) => ({
        product_id: product.id,
        url,
        is_primary: i === 0,
      }))
    );

    return { success: true };
  } catch (err: any) {
    console.error("CREATE ERROR:", err);
    return { success: false, message: err.message };
  }
}

/* ============================= */
/* ✏️ UPDATE PRODUCT */
/* ============================= */

export async function updateProduct(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Unauthorized" };

    const id = String(formData.get("id"));

    const { data: product } = await supabase
      .from("products")
      .select("seller_id, category_id")
      .eq("id", id)
      .single();

    if (product?.seller_id !== user.id) {
      return { success: false, message: "Not allowed" };
    }

    const variants = JSON.parse(
      String(formData.get("variants") || "[]")
    );

    const { data: category } = await supabase
      .from("categories")
      .select("margin_percent")
      .eq("id", product.category_id)
      .single();

    const margin = Number(category?.margin_percent || 25);

    const cleanVariants = variants.map((v: any) => {
      const cost_price = Number(v.cost_price || 0);

      const pricing = calculatePrice({
        cost_price,
        margin_percent: margin,
      });

      return {
        product_id: id,
        cost_price,
        mrp: Number(v.mrp || 0),
        stock: Number(v.stock || 0),
        size: v.size,
        color: v.color,
        ...pricing,
      };
    });

    await supabase.from("products").update({
      name: formData.get("name"),
      category_id: formData.get("category_id"),
    }).eq("id", id);

    await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", id);

    await supabase.from("product_variants").insert(cleanVariants);

    return { success: true };
  } catch (err: any) {
    console.error("UPDATE ERROR:", err);
    return { success: false, message: err.message };
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
      .select(`
        *,
        addresses (*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    /* ============================= */
    /* 🔐 SELLER CHECK */
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
    /* 🚫 VALIDATION */
    /* ============================= */

    if (
      order.status !== "placed"
    ) {
      return {
        success: false,
        message:
          "Only placed orders can be accepted",
      };
    }

    /* ============================= */
    /* 👤 CUSTOMER */
    /* ============================= */

    const {
      data: customer,
    } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq(
        "id",
        order.customer_id
      )
      .single();

    if (!customer) {
      return {
        success: false,
        message:
          "Customer not found",
      };
    }

    /* ============================= */
    /* 📦 ORDER ITEMS */
    /* ============================= */

    const {
      data: items,
      error: itemsError,
    } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq(
        "order_id",
        orderId
      );

    if (
      itemsError ||
      !items?.length
    ) {
      return {
        success: false,
        message:
          "Order items not found",
      };
    }

    /* ============================= */
    /* 🏪 SELLER */
    /* ============================= */

    const {
      data: seller,
    } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!seller) {
      return {
        success: false,
        message:
          "Seller not found",
      };
    }

    /* ============================= */
    /* 📍 SELLER ADDRESS */
    /* ============================= */

    const sellerAddress =
      await getSellerPickupAddress(
        user.id
      );

    /* ============================= */
    /* 🚚 CREATE SHIPMENT */
    /* ============================= */

    const shipment =
      await createShipment({
        order,

        customer,

        address:
          order.addresses,

        items,

        seller: {
          ...seller,
          ...sellerAddress,
        },
      });

    /* ============================= */
    /* 🕒 TIME */
    /* ============================= */

    const now =
      new Date().toISOString();

    /* ============================= */
    /* ✅ UPDATE MAIN ORDER */
    /* ============================= */

    const {
      error: updateOrderError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        status:
          "processing",

        accepted_at: now,

        processing_at:
          now,

        shipment_id:
          shipment.shipment_id,

        awb_code:
          shipment.awb_code,

        courier_name:
          shipment.courier_name,

        tracking_url:
          shipment.tracking_url,
      })
      .eq("id", orderId);

    if (
      updateOrderError
    ) {
      return {
        success: false,
        message:
          updateOrderError.message,
      };
    }

    /* ============================= */
    /* ✅ UPDATE ORDER ITEMS */
    /* ============================= */

    const {
      error:
        updateItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        status:
          "processing",

        accepted_at: now,

        processing_at:
          now,

        tracking_id:
          shipment.awb_code,

        courier_name:
          shipment.courier_name,
      })
      .eq(
        "order_id",
        orderId
      );

    if (
      updateItemsError
    ) {
      return {
        success: false,
        message:
          updateItemsError.message,
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
        "Order accepted successfully",
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