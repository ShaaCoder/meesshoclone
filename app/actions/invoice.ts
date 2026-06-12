"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { generateInvoicePDF } from "@/lib/pdf/generateInvoicePDF";

/* =======================================================
   🧾 GENERATE SELLER INVOICES
======================================================= */

export async function generateSellerInvoice(
  orderId: string
) {
  try {
    /* =======================================================
       📦 FETCH ORDER
    ======================================================= */

    const {
      data: order,
      error: orderError,
    } =
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
            status,
            amount
          )
        `)
        .eq("id", orderId)
        .single();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "ORDER ERROR:",
        orderError
      );

      throw new Error(
        "Order not found"
      );
    }

    /* =======================================================
       📦 FETCH ORDER ITEMS
    ======================================================= */

    const {
      data: items,
      error: itemsError,
    } =
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
            mrp,
            selling_price,
            platform_margin,
            seller_profit,
            attributes
          )
        `)
        .eq("order_id", orderId);

    if (
      itemsError ||
      !items?.length
    ) {
      console.error(
        "ITEM ERROR:",
        itemsError
      );

      throw new Error(
        "Order items not found"
      );
    }

    /* =======================================================
       🧠 GROUP BY SELLER
    ======================================================= */

    const sellerGroups: Record<
      string,
      any[]
    > = {};

    for (const item of items) {
      if (!item.seller_id)
        continue;

      if (
        !sellerGroups[
          item.seller_id
        ]
      ) {
        sellerGroups[
          item.seller_id
        ] = [];
      }

      sellerGroups[
        item.seller_id
      ].push(item);
    }

    /* =======================================================
       📄 GENERATED URLS
    ======================================================= */

    const invoiceUrls: string[] =
      [];

    /* =======================================================
       🔁 LOOP SELLERS
    ======================================================= */

    for (const sellerId of Object.keys(
      sellerGroups
    )) {
      const sellerItems =
        sellerGroups[sellerId];

      /* =======================================================
         👤 SELLER
      ======================================================= */

      const {
        data: seller,
        error: sellerError,
      } =
        await supabaseAdmin
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
          "SELLER ERROR:",
          sellerError
        );

        continue;
      }

      /* =======================================================
         📍 SELLER ADDRESS
      ======================================================= */

      const sellerAddress =
        seller
          ?.seller_addresses?.[0] ||
        null;

      /* =======================================================
         🧾 INVOICE NUMBER
      ======================================================= */

      const invoiceNumber = `INV-${sellerId
        .slice(0, 4)
        .toUpperCase()}-${Date.now()}`;

      /* =======================================================
         🧠 TOTALS
      ======================================================= */

      let totalTaxable = 0;

      let totalGST = 0;

      let totalPlatformFee = 0;

      let totalSellerProfit = 0;

      let grandTotal = 0;

      /* =======================================================
         🧠 CALCULATE
      ======================================================= */

      for (const item of sellerItems) {
        const quantity =
          Number(
            item.quantity || 0
          );

        const finalPrice =
          Number(
            item.final_price ||
              0
          );

        const gstPercent =
          Number(
            item.gst_percent ||
              0
          );

        const sellerEarning =
          Number(
            item.seller_earning ||
              0
          );

        const platformFee =
          Number(
            item.platform_fee ||
              0
          );

        const lineTotal =
          finalPrice;

        /* ============================= */
        /* GST INCLUDED */
        /* ============================= */

        const taxable =
          gstPercent > 0
            ? (lineTotal * 100) /
              (100 +
                gstPercent)
            : lineTotal;

        const gst =
          lineTotal - taxable;

        totalTaxable +=
          taxable;

        totalGST += gst;

        totalPlatformFee +=
          platformFee;

        totalSellerProfit +=
          sellerEarning;

        grandTotal += lineTotal;
      }

      /* =======================================================
         🏛 GST SPLIT
      ======================================================= */

      const customerState =
        String(
          order.addresses
            ?.state || ""
        )
          .trim()
          .toLowerCase();

      const sellerState =
        String(
          sellerAddress
            ?.state || ""
        )
          .trim()
          .toLowerCase();

      const sameState =
        customerState ===
        sellerState;

      const cgst = sameState
        ? totalGST / 2
        : 0;

      const sgst = sameState
        ? totalGST / 2
        : 0;

      const igst = !sameState
        ? totalGST
        : 0;

      /* =======================================================
         📄 PDF
      ======================================================= */

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

            totalPlatformFee,

            totalSellerProfit,

            cgst,

            sgst,

            igst,

            grandTotal,
          }
        );

      /* =======================================================
         ☁️ FILE PATH
      ======================================================= */

      const filePath = `invoices/${sellerId}/${invoiceNumber}.pdf`;

      /* =======================================================
         ☁️ UPLOAD
      ======================================================= */

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
          "UPLOAD ERROR:",
          uploadError
        );

        continue;
      }

      /* =======================================================
         🔗 PUBLIC URL
      ======================================================= */

      const {
        data: publicData,
      } =
        supabaseAdmin.storage
          .from("invoices")
          .getPublicUrl(
            filePath
          );

      const invoiceUrl =
        publicData.publicUrl;

      /* =======================================================
         💾 SAVE DB
      ======================================================= */

      const {
        error: invoiceError,
      } =
        await supabaseAdmin
          .from("invoices")
          .insert({
            order_id:
              order.id,

            seller_id:
              sellerId,

            user_id:
              order.customer_id,

            invoice_number:
              invoiceNumber,

            pdf_url:
              invoiceUrl,

            amount:
              Math.round(
                grandTotal
              ),

            type:
              "seller_invoice",

            details: {
              totalGST:
                Number(
                  totalGST.toFixed(
                    2
                  )
                ),

              totalTaxable:
                Number(
                  totalTaxable.toFixed(
                    2
                  )
                ),

              totalPlatformFee:
                Number(
                  totalPlatformFee.toFixed(
                    2
                  )
                ),

              totalSellerProfit:
                Number(
                  totalSellerProfit.toFixed(
                    2
                  )
                ),

              cgst: Number(
                cgst.toFixed(2)
              ),

              sgst: Number(
                sgst.toFixed(2)
              ),

              igst: Number(
                igst.toFixed(2)
              ),

              grandTotal:
                Number(
                  grandTotal.toFixed(
                    2
                  )
                ),

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
          "INVOICE DB ERROR:",
          invoiceError
        );

        continue;
      }

      /* =======================================================
         ✅ PUSH URL
      ======================================================= */

      invoiceUrls.push(
        invoiceUrl
      );
    }

    /* =======================================================
       ✅ RETURN
    ======================================================= */

    return {
      success: true,

      invoices:
        invoiceUrls,
    };
  } catch (error: any) {
    console.error(
      "INVOICE ERROR:",
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