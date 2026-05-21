"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateInvoicePDF } from "@/lib/pdf/generateInvoicePDF";

/* ============================= */
/* 🧾 GENERATE SELLER INVOICE */
/* ============================= */
export async function generateSellerInvoice(orderId: string) {
  /* ============================= */
  /* 1. FETCH ORDER */
  /* ============================= */
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  /* ============================= */
  /* 2. FETCH ORDER ITEMS */
  /* ============================= */
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select(`
      *,
      products(
        name,
        product_images ( url, is_primary )
      ),
      product_variants(selling_price, cost_price, platform_margin)
    `)
    .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) {
    throw new Error("Order items not found");
  }

  /* ============================= */
  /* 🔥 GROUP BY SELLER */
  /* ============================= */
  const sellerMap: Record<string, any[]> = {};

  for (const item of items) {
    if (!sellerMap[item.seller_id]) {
      sellerMap[item.seller_id] = [];
    }
    sellerMap[item.seller_id].push(item);
  }

  const invoiceUrls: string[] = [];

  /* ============================= */
  /* 🔁 GENERATE PER SELLER */
  /* ============================= */
  for (const sellerId of Object.keys(sellerMap)) {
    const sellerItems = sellerMap[sellerId];

    /* ============================= */
    /* 🧾 INVOICE NUMBER */
    /* ============================= */
    const invoiceNumber =
      "INV-" + sellerId.slice(0, 4) + "-" + Date.now();

    /* ============================= */
    /* 📊 CALCULATIONS */
    /* ============================= */
    let totalGST = 0;
    let totalTaxable = 0;
    let grandTotal = 0;

    sellerItems.forEach((item: any) => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 0);

      const taxable = price * qty;
      const gstPercent = Number(item.gst_percent || 0);

      const gst = (taxable * gstPercent) / 100;

      totalTaxable += taxable;
      totalGST += gst;
      grandTotal += taxable + gst;
    });

    /* ============================= */
    /* 🏢 GET SELLER STATE */
    /* ============================= */
    const { data: seller } = await supabaseAdmin
      .from("users")
      .select("state")
      .eq("id", sellerId)
      .single();

    const sellerState = seller?.state || "Delhi";
    const isSameState = order.state === sellerState;

    const cgst = isSameState ? totalGST / 2 : 0;
    const sgst = isSameState ? totalGST / 2 : 0;
    const igst = !isSameState ? totalGST : 0;

    /* ============================= */
    /* 📄 GENERATE PDF */
    /* ============================= */
    const pdfBuffer = await generateInvoicePDF(
      order,
      sellerItems,
      invoiceNumber,
      {
        totalGST,
        totalTaxable,
        cgst,
        sgst,
        igst,
        grandTotal,
      }
    );

    /* ============================= */
    /* ☁️ UPLOAD */
    /* ============================= */
    const filePath = `invoices/${invoiceNumber}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      continue;
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("invoices")
      .getPublicUrl(filePath);

    /* ============================= */
    /* 💾 SAVE IN DB */
    /* ============================= */
    await supabaseAdmin.from("invoices").insert({
      order_id: orderId,
      user_id: order.customer_id,
      seller_id: sellerId,
      invoice_number: invoiceNumber,
      pdf_url: publicUrl.publicUrl,
      amount: grandTotal,
      type: "seller_invoice",

      details: {
        totalGST,
        totalTaxable,
        cgst,
        sgst,
        igst,
      },
    });

    invoiceUrls.push(publicUrl.publicUrl);
  }

  return invoiceUrls;
}