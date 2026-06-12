import {
  PDFDocument,
  rgb,
  StandardFonts,
} from "pdf-lib";

import bwipjs from "bwip-js";

/* =======================================================
   🧾 GENERATE MARKETPLACE INVOICE PDF
======================================================= */

export async function generateInvoicePDF(
  order: any,
  items: any[],
  invoiceNumber: string,
  summary: {
    totalGST: number;

    totalTaxable: number;

    totalPlatformFee?: number;

    totalSellerProfit?: number;

    cgst?: number;

    sgst?: number;

    igst?: number;

    grandTotal: number;
  }
) {
  /* =======================================================
     📄 PAGE HEIGHT
  ======================================================= */

  const pageHeight =
    Math.max(
      1100,
      760 + items.length * 42
    );

  const pdfDoc =
    await PDFDocument.create();

  const page =
    pdfDoc.addPage([
      650,
      pageHeight,
    ]);

  /* =======================================================
     🔤 FONTS
  ======================================================= */

  const font =
    await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

  const bold =
    await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

  /* =======================================================
     🎨 COLORS
  ======================================================= */

  const black = rgb(0, 0, 0);

  const gray = rgb(
    0.45,
    0.45,
    0.45
  );

  const lightGray = rgb(
    0.94,
    0.94,
    0.94
  );

  const borderGray = rgb(
    0.8,
    0.8,
    0.8
  );

  /* =======================================================
     📍 START Y
  ======================================================= */

  let y =
    pageHeight - 45;

  /* =======================================================
     🏢 SELLER
  ======================================================= */

  const seller =
    order?.seller || {};

  const sellerAddress =
    order?.sellerAddress ||
    {};

  /* =======================================================
     🧾 TITLE
  ======================================================= */

  page.drawText(
    "TAX INVOICE",
    {
      x: 245,
      y,
      size: 22,
      font: bold,
      color: black,
    }
  );

  y -= 45;

  /* =======================================================
     📦 BOXES
  ======================================================= */

  page.drawRectangle({
    x: 35,
    y: y - 120,
    width: 270,
    height: 120,
    borderWidth: 1,
    borderColor:
      borderGray,
  });

  page.drawRectangle({
    x: 330,
    y: y - 120,
    width: 285,
    height: 120,
    borderWidth: 1,
    borderColor:
      borderGray,
  });

  /* =======================================================
     🏪 SOLD BY
  ======================================================= */

  page.drawText(
    "Sold By",
    {
      x: 45,
      y: y - 18,
      size: 12,
      font: bold,
    }
  );

  page.drawText(
    seller?.name ||
      "Marketplace Seller",
    {
      x: 45,
      y: y - 40,
      size: 10,
      font,
    }
  );

  page.drawText(
    sellerAddress?.warehouse_name ||
      "Warehouse",
    {
      x: 45,
      y: y - 56,
      size: 10,
      font,
    }
  );

  page.drawText(
    sellerAddress?.address_line ||
      "Address unavailable",
    {
      x: 45,
      y: y - 72,
      size: 10,
      font,
    }
  );

  page.drawText(
    `${sellerAddress?.city || ""}, ${
      sellerAddress?.state || ""
    } - ${
      sellerAddress?.pincode || ""
    }`,
    {
      x: 45,
      y: y - 88,
      size: 10,
      font,
    }
  );

  page.drawText(
    `Phone: ${
      sellerAddress?.phone ||
      seller?.phone ||
      "-"
    }`,
    {
      x: 45,
      y: y - 104,
      size: 10,
      font,
    }
  );

  /* =======================================================
     🧾 INVOICE INFO
  ======================================================= */

  const invoiceX = 345;

  page.drawText(
    `Invoice No: ${invoiceNumber}`,
    {
      x: invoiceX,
      y: y - 18,
      size: 10,
      font: bold,
    }
  );

  page.drawText(
    `Order ID: ${
      order?.order_code ||
      order?.id
    }`,
    {
      x: invoiceX,
      y: y - 36,
      size: 10,
      font,
    }
  );

  page.drawText(
    `Date: ${new Date().toLocaleDateString()}`,
    {
      x: invoiceX,
      y: y - 54,
      size: 10,
      font,
    }
  );

  page.drawText(
    `Payment Method: ${(
      order?.payment_method ||
      "COD"
    ).toUpperCase()}`,
    {
      x: invoiceX,
      y: y - 72,
      size: 10,
      font,
    }
  );

  page.drawText(
    `Payment Status: ${(
      order?.payment_status ||
      "unpaid"
    ).toUpperCase()}`,
    {
      x: invoiceX,
      y: y - 90,
      size: 10,
      font,
    }
  );

  /* =======================================================
     👤 CUSTOMER
  ======================================================= */

  y -= 155;

  page.drawRectangle({
    x: 35,
    y: y - 95,
    width: 580,
    height: 95,
    borderWidth: 1,
    borderColor:
      borderGray,
  });

  page.drawText(
    "Shipping Address",
    {
      x: 45,
      y: y - 18,
      size: 12,
      font: bold,
    }
  );

  const customer =
    order?.addresses || {};

  page.drawText(
    customer?.name ||
      "Customer",
    {
      x: 45,
      y: y - 40,
      size: 10,
      font,
    }
  );

  page.drawText(
    customer?.phone || "-",
    {
      x: 45,
      y: y - 56,
      size: 10,
      font,
    }
  );

  page.drawText(
    customer?.address_line ||
      "",
    {
      x: 45,
      y: y - 72,
      size: 10,
      font,
    }
  );

  page.drawText(
    `${customer?.city || ""}, ${
      customer?.state || ""
    } - ${
      customer?.pincode || ""
    }`,
    {
      x: 45,
      y: y - 88,
      size: 10,
      font,
    }
  );

  /* =======================================================
     📦 BARCODE
  ======================================================= */

  const awb =
    order?.awb_code ||
    order?.shipment_id ||
    order?.id?.slice(0, 10);

  try {
    const barcodeBuffer =
      await bwipjs.toBuffer({
        bcid: "code128",
        text: String(awb),
        scale: 2,
        height: 10,
        includetext: false,
      });

    const barcode =
      await pdfDoc.embedPng(
        barcodeBuffer
      );

    page.drawImage(
      barcode,
      {
        x: 385,
        y: y - 80,
        width: 190,
        height: 45,
      }
    );

    page.drawText(
      `AWB: ${awb}`,
      {
        x: 425,
        y: y - 92,
        size: 9,
        font,
      }
    );
  } catch (error) {
    console.log(
      "Barcode failed"
    );
  }

  /* =======================================================
     📋 TABLE HEADER
  ======================================================= */

  y -= 140;

  page.drawRectangle({
    x: 35,
    y: y - 5,
    width: 580,
    height: 28,
    color: lightGray,
  });

  page.drawText(
    "Product",
    {
      x: 45,
      y,
      size: 10,
      font: bold,
    }
  );

  page.drawText("Qty", {
    x: 285,
    y,
    size: 10,
    font: bold,
  });

  page.drawText(
    "Selling",
    {
      x: 335,
      y,
      size: 10,
      font: bold,
    }
  );

  page.drawText("GST", {
    x: 415,
    y,
    size: 10,
    font: bold,
  });

  page.drawText(
    "Total",
    {
      x: 520,
      y,
      size: 10,
      font: bold,
    }
  );

  y -= 35;

  /* =======================================================
     📦 ITEMS
  ======================================================= */

  for (const item of items) {
    const quantity =
      Number(
        item.quantity || 0
      );

    const finalPrice =
      Number(
        item.final_price || 0
      );

    const gstPercent =
      Number(
        item.gst_percent || 0
      );

    const total =
      finalPrice;

    const productName = (
      item?.products?.name ||
      item?.product_name ||
      "Product"
    ).slice(0, 42);

    const variant =
      item?.product_variants;

    const attrs =
      variant?.attributes ||
      {};

    const attrText =
      Object.entries(attrs)
        .map(
          ([k, v]) =>
            `${k}: ${v}`
        )
        .join(" | ")
        .slice(0, 55);

    /* ============================= */
    /* PRODUCT */
    /* ============================= */

    page.drawText(
      productName,
      {
        x: 45,
        y,
        size: 9,
        font: bold,
      }
    );

    y -= 14;

    if (attrText) {
      page.drawText(
        attrText,
        {
          x: 45,
          y,
          size: 8,
          font,
          color: gray,
        }
      );
    }

    /* ============================= */
    /* OTHER DATA */
    /* ============================= */

    page.drawText(
      String(quantity),
      {
        x: 290,
        y: y + 14,
        size: 9,
        font,
      }
    );

    page.drawText(
      `Rs ${finalPrice.toFixed(
        2
      )}`,
      {
        x: 325,
        y: y + 14,
        size: 9,
        font,
      }
    );

    page.drawText(
      `${gstPercent}%`,
      {
        x: 420,
        y: y + 14,
        size: 9,
        font,
      }
    );

    page.drawText(
      `Rs ${total.toFixed(
        2
      )}`,
      {
        x: 500,
        y: y + 14,
        size: 9,
        font,
      }
    );

    /* ============================= */
    /* MARKETPLACE BREAKDOWN */
    /* ============================= */

    const platformMargin =
      Number(
        variant?.platform_margin ||
          0
      );

    const sellerProfit =
      Number(
        variant?.seller_profit ||
          0
      );

    const costPrice =
      Number(
        variant?.cost_price ||
          0
      );

    y -= 14;

    page.drawText(
      `Cost: Rs ${costPrice} | Platform Fee: Rs ${platformMargin} | Seller Profit: Rs ${sellerProfit}`,
      {
        x: 45,
        y,
        size: 8,
        font,
        color: gray,
      }
    );

    /* ============================= */
    /* LINE */
    /* ============================= */

    y -= 14;

    page.drawLine({
      start: {
        x: 35,
        y,
      },
      end: {
        x: 615,
        y,
      },
      thickness: 0.6,
      color: lightGray,
    });

    y -= 18;
  }

  /* =======================================================
     💰 SUMMARY
  ======================================================= */

  const {
    totalGST,

    totalTaxable,

    totalPlatformFee = 0,

    totalSellerProfit = 0,

    cgst = 0,

    sgst = 0,

    igst = 0,

    grandTotal,
  } = summary;

  page.drawRectangle({
    x: 330,
    y: y - 120,
    width: 285,
    height: 120,
    borderWidth: 1,
    borderColor:
      borderGray,
  });

  y -= 20;

  page.drawText(
    `Taxable Amount: Rs ${totalTaxable.toFixed(
      2
    )}`,
    {
      x: 345,
      y,
      size: 10,
      font,
    }
  );

  y -= 18;

  if (cgst > 0) {
    page.drawText(
      `CGST: Rs ${cgst.toFixed(
        2
      )}`,
      {
        x: 345,
        y,
        size: 10,
        font,
      }
    );

    y -= 18;

    page.drawText(
      `SGST: Rs ${sgst.toFixed(
        2
      )}`,
      {
        x: 345,
        y,
        size: 10,
        font,
      }
    );
  } else {
    page.drawText(
      `IGST: Rs ${igst.toFixed(
        2
      )}`,
      {
        x: 345,
        y,
        size: 10,
        font,
      }
    );
  }

  y -= 18;

  page.drawText(
    `Platform Fee: Rs ${totalPlatformFee.toFixed(
      2
    )}`,
    {
      x: 345,
      y,
      size: 10,
      font,
    }
  );

  y -= 18;

  page.drawText(
    `Seller Earnings: Rs ${totalSellerProfit.toFixed(
      2
    )}`,
    {
      x: 345,
      y,
      size: 10,
      font,
    }
  );

  y -= 22;

  page.drawLine({
    start: {
      x: 340,
      y,
    },
    end: {
      x: 600,
      y,
    },
    thickness: 1,
    color: gray,
  });

  y -= 20;

  page.drawText(
    `Grand Total: Rs ${grandTotal.toFixed(
      2
    )}`,
    {
      x: 345,
      y,
      size: 14,
      font: bold,
    }
  );

  /* =======================================================
     ✍ FOOTER
  ======================================================= */

  y -= 70;

  page.drawText(
    "This is a computer generated invoice.",
    {
      x: 40,
      y,
      size: 9,
      font,
      color: gray,
    }
  );

  y -= 16;

  page.drawText(
    "Thank you for shopping with us.",
    {
      x: 40,
      y,
      size: 9,
      font,
      color: gray,
    }
  );

  y -= 35;

  page.drawText(
    "Authorized Signature",
    {
      x: 450,
      y,
      size: 10,
      font: bold,
    }
  );

  /* =======================================================
     💾 SAVE PDF
  ======================================================= */

  return await pdfDoc.save();
}