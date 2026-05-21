"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateInvoicePDF } from "@/lib/pdf/generateInvoicePDF";

/* ======================================== */
/* 🧾 GENERATE SELLER INVOICES */
/* ======================================== */
export async function generateSellerInvoice(
  orderId: string
) {
  try {
    /* ======================================== */
    /* 📦 FETCH ORDER + ADDRESS + PAYMENT */
    /* ======================================== */

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select(`
          *,
          addresses (
            id,
            name,
            phone,
            address_line,
            city,
            state,
            pincode
          ),
          payments (
            razorpay_payment_id,
            method,
            status
          )
        `)
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    /* ======================================== */
    /* 📦 FETCH ORDER ITEMS */
    /* ======================================== */

    const { data: items, error: itemsError } =
      await supabaseAdmin
        .from("order_items")
        .select(`
          *,
          products (
            id,
            name,
            slug,
            product_images (
              url,
              is_primary
            )
          ),
          product_variants (
            id,
            cost_price,
            selling_price,
            platform_margin,
            seller_profit
          )
        `)
        .eq("order_id", orderId);

    if (
      itemsError ||
      !items ||
      items.length === 0
    ) {
      throw new Error(
        "Order items not found"
      );
    }

    /* ======================================== */
    /* 🔥 GROUP ITEMS BY SELLER */
    /* ======================================== */

    const sellerMap: Record<
      string,
      any[]
    > = {};

    for (const item of items) {
      if (!item.seller_id) continue;

      if (!sellerMap[item.seller_id]) {
        sellerMap[item.seller_id] = [];
      }

      sellerMap[item.seller_id].push(item);
    }

    /* ======================================== */
    /* 📄 GENERATED URLS */
    /* ======================================== */

    const invoiceUrls: string[] = [];

    /* ======================================== */
    /* 🔁 GENERATE INVOICE FOR EACH SELLER */
    /* ======================================== */

    await Promise.all(
      Object.keys(sellerMap).map(
        async (sellerId) => {
          const sellerItems =
            sellerMap[sellerId];

          /* ======================================== */
          /* 🏢 FETCH SELLER */
          /* ======================================== */

          const {
            data: seller,
            error: sellerError,
          } = await supabaseAdmin
            .from("users")
            .select(`
              *,
              seller_addresses (
                *
              ),
              bank_accounts (
                *
              )
            `)
            .eq("id", sellerId)
            .single();

          if (
            sellerError ||
            !seller
          ) {
            console.error(
              "Seller not found"
            );
            return;
          }

          /* ======================================== */
          /* 📍 SELLER ADDRESS */
          /* ======================================== */

          const sellerAddress =
            seller
              ?.seller_addresses?.[0] ||
            null;

          /* ======================================== */
          /* 🧾 INVOICE NUMBER */
          /* ======================================== */

          const invoiceNumber = `INV-${sellerId
            .slice(0, 4)
            .toUpperCase()}-${Date.now()}`;

          /* ======================================== */
          /* 📊 CALCULATIONS */
          /* ======================================== */

          let totalGST = 0;
          let totalTaxable = 0;
          let grandTotal = 0;

          for (const item of sellerItems) {
            const quantity = Number(
              item.quantity || 0
            );

            const finalPrice = Number(
              item.final_price || 0
            );

            const gstPercent = Number(
              item.gst_percent || 0
            );

            /* ======================================== */
            /* 💰 TOTAL */
            /* ======================================== */

            const total =
              finalPrice * quantity;

            /* ======================================== */
            /* 🧠 GST INCLUDED LOGIC */
            /* ======================================== */

            const taxable =
              gstPercent > 0
                ? (total * 100) /
                  (100 + gstPercent)
                : total;

            const gst =
              total - taxable;

            totalTaxable += taxable;
            totalGST += gst;
            grandTotal += total;
          }

          /* ======================================== */
          /* 🏛 GST SPLIT */
          /* ======================================== */

          const customerState =
            order.addresses?.state ||
            "";

          const sellerState =
            sellerAddress?.state ||
            "";

          const isSameState =
            customerState
              .toLowerCase()
              .trim() ===
            sellerState
              .toLowerCase()
              .trim();

          const cgst = isSameState
            ? totalGST / 2
            : 0;

          const sgst = isSameState
            ? totalGST / 2
            : 0;

          const igst = !isSameState
            ? totalGST
            : 0;

          /* ======================================== */
          /* 📄 GENERATE PDF */
          /* ======================================== */

          const pdfBuffer =
            await generateInvoicePDF(
              {
                ...order,
                seller,
                sellerAddress,
              },
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

          /* ======================================== */
          /* ☁️ STORAGE PATH */
          /* ======================================== */

          const filePath = `invoices/${sellerId}/${invoiceNumber}.pdf`;

          /* ======================================== */
          /* ☁️ UPLOAD PDF */
          /* ======================================== */

          const {
            error: uploadError,
          } =
            await supabaseAdmin.storage
              .from("invoices")
              .upload(
                filePath,
                pdfBuffer,
                {
                  contentType:
                    "application/pdf",
                  upsert: true,
                }
              );

          if (uploadError) {
            console.error(
              "Invoice upload failed",
              uploadError
            );

            return;
          }

          /* ======================================== */
          /* 🔗 PUBLIC URL */
          /* ======================================== */

          const { data: publicUrl } =
            supabaseAdmin.storage
              .from("invoices")
              .getPublicUrl(
                filePath
              );

          const invoiceUrl =
            publicUrl.publicUrl;

          /* ======================================== */
          /* 💾 SAVE IN DATABASE */
          /* ======================================== */

          const {
            error: invoiceError,
          } = await supabaseAdmin
            .from("invoices")
            .insert({
              order_id: order.id,

              seller_id: sellerId,

              user_id:
                order.customer_id,

              invoice_number:
                invoiceNumber,

              pdf_url: invoiceUrl,

              amount: grandTotal,

              type: "seller_invoice",

              details: {
                totalGST,

                totalTaxable,

                cgst,

                sgst,

                igst,

                grandTotal,

                itemCount:
                  sellerItems.length,

                paymentMethod:
                  order.payment_method,

                paymentStatus:
                  order.payment_status,
              },
            });

          if (invoiceError) {
            console.error(
              "Invoice DB save failed",
              invoiceError
            );

            return;
          }

          /* ======================================== */
          /* ✅ PUSH URL */
          /* ======================================== */

          invoiceUrls.push(invoiceUrl);
        }
      )
    );

    /* ======================================== */
    /* ✅ RETURN */
    /* ======================================== */

    return {
      success: true,
      invoices: invoiceUrls,
    };
  } catch (error: any) {
    console.error(
      "Invoice generation failed",
      error
    );

    return {
      success: false,
      message:
        error?.message ||
        "Failed to generate invoices",
    };
  }
}