"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateInvoicePDF } from "@/lib/pdf/generateInvoicePDF";

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
    console.error(orderError);
    throw new Error("Order not found");
  }

  /* ============================= */
  /* 2. FETCH ORDER ITEMS */
  /* ============================= */
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("*, products(*)")
    .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) {
    console.error(itemsError);
    throw new Error("Order items not found");
  }

  /* ============================= */
  /* 3. GENERATE INVOICE NUMBER */
  /* ============================= */
  const invoiceNumber = "INV-" + Date.now();

  /* ============================= */
  /* 🧾 GST CALCULATION */
  /* ============================= */
  let totalGST = 0;
  let totalTaxable = 0;

  items.forEach((item: any) => {
    totalGST += Number(item.gst_amount || 0);
    totalTaxable += Number(item.taxable_amount || 0);
  });

  /* ============================= */
  /* 🇮🇳 GST SPLIT (CGST / SGST / IGST) */
  /* ============================= */
  const sellerState = "Delhi"; // ⚠️ later make dynamic from seller profile
  const isSameState = order.state === sellerState;

  const cgst = isSameState ? totalGST / 2 : 0;
  const sgst = isSameState ? totalGST / 2 : 0;
  const igst = !isSameState ? totalGST : 0;

  /* ============================= */
  /* 📄 CREATE PDF */
  /* ============================= */
  const pdfBuffer = await generateInvoicePDF(
    order,
    items,
    invoiceNumber,
    {
      totalGST,
      totalTaxable,
      cgst,
      sgst,
      igst,
      grandTotal: order.total_amount,
    }
  );

  /* ============================= */
  /* 5. UPLOAD TO SUPABASE STORAGE */
  /* ============================= */
  const filePath = `invoices/${invoiceNumber}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("invoices")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true, // ✅ prevents duplicate errors
    });

  if (uploadError) {
    console.error(uploadError);
    throw new Error("Upload failed");
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from("invoices")
    .getPublicUrl(filePath);

  /* ============================= */
  /* 6. SAVE IN DB (WITH DETAILS) */
  /* ============================= */
  await supabaseAdmin.from("invoices").insert({
    order_id: orderId,
    user_id: order.customer_id,
    seller_id: items[0].seller_id,
    invoice_number: invoiceNumber,
    pdf_url: publicUrl.publicUrl,
    amount: order.total_amount,
    type: "order_invoice",

    /* 🔥 IMPORTANT: SAVE TAX BREAKDOWN */
    details: {
      totalGST,
      totalTaxable,
      cgst,
      sgst,
      igst,
    },
  });

  return publicUrl.publicUrl;
}