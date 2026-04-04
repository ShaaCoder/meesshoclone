"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { v4 as uuidv4 } from "uuid";
import { generateInvoicePDF } from "@/lib/pdf/generateInvoicePDF";
export async function generateSellerInvoice(orderId: string) {
  /* 1. FETCH ORDER */
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  /* 2. FETCH ORDER ITEMS */
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*, products(*)")
    .eq("order_id", orderId);

  if (!order || !items) throw new Error("Order not found");

  /* 3. GENERATE INVOICE NUMBER */
  const invoiceNumber = "INV-" + Date.now();

  /* 4. CREATE PDF */
  const pdfBuffer = await generateInvoicePDF(order, items, invoiceNumber);

  /* 5. UPLOAD TO SUPABASE STORAGE */
  const filePath = `invoices/${invoiceNumber}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("invoices")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
    });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabaseAdmin.storage
    .from("invoices")
    .getPublicUrl(filePath);

  /* 6. SAVE IN DB */
  await supabaseAdmin.from("invoices").insert({
    order_id: orderId,
    user_id: order.customer_id,
    seller_id: items[0].seller_id,
    invoice_number: invoiceNumber,
    pdf_url: publicUrl.publicUrl,
    amount: order.total_amount,
    type: "order_invoice",
  });

  return publicUrl.publicUrl;
}