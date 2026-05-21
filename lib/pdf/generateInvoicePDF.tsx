import {
  PDFDocument,
  rgb,
  StandardFonts,
} from "pdf-lib";

import bwipjs from "bwip-js";

/* ======================================== */
/* 🧾 GENERATE MARKETPLACE INVOICE PDF */
/* ======================================== */

export async function generateInvoicePDF(
  order: any,
  items: any[],
  invoiceNumber: string,
  summary: {
    totalGST: number;
    totalTaxable: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    grandTotal: number;
  }
) {
  /* ======================================== */
  /* 📄 DYNAMIC PAGE HEIGHT */
  /* ======================================== */

  const pageHeight = Math.max(
    950,
    700 + items.length * 28
  );

  const pdfDoc =
    await PDFDocument.create();

  const page = pdfDoc.addPage([
    620,
    pageHeight,
  ]);

  /* ======================================== */
  /* 🔤 FONTS */
  /* ======================================== */

  const font =
    await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

  const bold =
    await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

  /* ======================================== */
  /* 🎨 COLORS */
  /* ======================================== */

  const black = rgb(0, 0, 0);

  const gray = rgb(
    0.45,
    0.45,
    0.45
  );

  const lightGray = rgb(
    0.93,
    0.93,
    0.93
  );

  /* ======================================== */
  /* 📍 START POSITION */
  /* ======================================== */

  let y = pageHeight - 50;

  /* ======================================== */
  /* 🏢 SELLER DETAILS */
  /* ======================================== */

  const seller =
    order?.seller || {};

  const sellerAddress =
    order?.sellerAddress || {};

  page.drawText("TAX INVOICE", {
    x: 240,
    y,
    size: 20,
    font: bold,
    color: black,
  });

  y -= 40;

  /* ======================================== */
  /* 🧾 SELLER SECTION */
  /* ======================================== */

  page.drawText("Sold By:", {
    x: 40,
    y,
    size: 11,
    font: bold,
  });

  y -= 18;

  page.drawText(
    seller?.name ||
      "Marketplace Seller",
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    sellerAddress?.warehouse_name ||
      "Warehouse",
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    sellerAddress?.address_line ||
      "Address unavailable",
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    `${sellerAddress?.city || ""}, ${
      sellerAddress?.state || ""
    } - ${
      sellerAddress?.pincode || ""
    }`,
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    `Phone: ${
      sellerAddress?.phone ||
      seller?.phone ||
      "-"
    }`,
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  /* ======================================== */
  /* 🧾 INVOICE DETAILS */
  /* ======================================== */

  const rightX = 360;
  let rightY = pageHeight - 90;

  page.drawText(
    `Invoice No: ${invoiceNumber}`,
    {
      x: rightX,
      y: rightY,
      size: 10,
      font: bold,
    }
  );

  rightY -= 16;

  page.drawText(
    `Order ID: ${
      order?.order_code || order?.id
    }`,
    {
      x: rightX,
      y: rightY,
      size: 10,
      font,
    }
  );

  rightY -= 16;

  page.drawText(
    `Date: ${new Date().toLocaleDateString()}`,
    {
      x: rightX,
      y: rightY,
      size: 10,
      font,
    }
  );

  rightY -= 16;

  page.drawText(
    `Payment: ${(
      order?.payment_method ||
      "COD"
    ).toUpperCase()}`,
    {
      x: rightX,
      y: rightY,
      size: 10,
      font,
    }
  );

  rightY -= 16;

  page.drawText(
    `Status: ${(
      order?.payment_status ||
      "unpaid"
    ).toUpperCase()}`,
    {
      x: rightX,
      y: rightY,
      size: 10,
      font,
    }
  );

  /* ======================================== */
  /* 👤 CUSTOMER SECTION */
  /* ======================================== */

  y -= 45;

  page.drawText("Ship To:", {
    x: 40,
    y,
    size: 11,
    font: bold,
  });

  y -= 18;

  const customerAddress =
    order?.addresses || {};

  page.drawText(
    customerAddress?.name ||
      "Customer",
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    customerAddress?.phone || "-",
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    customerAddress?.address_line ||
      "",
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  y -= 14;

  page.drawText(
    `${customerAddress?.city || ""}, ${
      customerAddress?.state || ""
    } - ${
      customerAddress?.pincode || ""
    }`,
    {
      x: 40,
      y,
      size: 10,
      font,
    }
  );

  /* ======================================== */
  /* 📦 BARCODE */
  /* ======================================== */

  y -= 50;

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

    page.drawImage(barcode, {
      x: 360,
      y: y - 10,
      width: 200,
      height: 50,
    });

    page.drawText(
      `AWB: ${awb}`,
      {
        x: 400,
        y: y - 25,
        size: 10,
        font,
      }
    );
  } catch (error) {
    console.log(
      "Barcode generation failed"
    );
  }

  /* ======================================== */
  /* 📋 TABLE HEADER */
  /* ======================================== */

  y -= 80;

  page.drawRectangle({
    x: 40,
    y: y - 5,
    width: 540,
    height: 24,
    color: lightGray,
  });

  page.drawText("Product", {
    x: 45,
    y,
    size: 10,
    font: bold,
  });

  page.drawText("Qty", {
    x: 280,
    y,
    size: 10,
    font: bold,
  });

  page.drawText("Price", {
    x: 340,
    y,
    size: 10,
    font: bold,
  });

  page.drawText("GST", {
    x: 420,
    y,
    size: 10,
    font: bold,
  });

  page.drawText("Total", {
    x: 500,
    y,
    size: 10,
    font: bold,
  });

  y -= 30;

  /* ======================================== */
  /* 📦 ITEMS */
  /* ======================================== */

  for (const item of items) {
    const quantity = Number(
      item.quantity || 0
    );

    const finalPrice = Number(
      item.final_price || 0
    );

    const gstPercent = Number(
      item.gst_percent || 0
    );

    const total =
      quantity * finalPrice;

    const productName = (
      item?.products?.name ||
      item?.product_name ||
      "Product"
    ).slice(0, 42);

    /* ======================================== */
    /* 🧠 ROW */
    /* ======================================== */

    page.drawText(productName, {
      x: 45,
      y,
      size: 9,
      font,
    });

    page.drawText(
      String(quantity),
      {
        x: 285,
        y,
        size: 9,
        font,
      }
    );

    page.drawText(
      `Rs ${finalPrice.toFixed(
        2
      )}`,
      {
        x: 330,
        y,
        size: 9,
        font,
      }
    );

    page.drawText(
      `${gstPercent}%`,
      {
        x: 425,
        y,
        size: 9,
        font,
      }
    );

    page.drawText(
      `Rs ${total.toFixed(2)}`,
      {
        x: 490,
        y,
        size: 9,
        font,
      }
    );

    /* ======================================== */
    /* ➖ LINE */
    /* ======================================== */

    page.drawLine({
      start: {
        x: 40,
        y: y - 6,
      },
      end: {
        x: 580,
        y: y - 6,
      },
      thickness: 0.5,
      color: lightGray,
    });

    y -= 22;
  }

  /* ======================================== */
  /* 💰 SUMMARY */
  /* ======================================== */

  y -= 25;

  const {
    totalGST,
    totalTaxable,
    cgst = 0,
    sgst = 0,
    igst = 0,
    grandTotal,
  } = summary;

  page.drawText(
    `Taxable Amount: Rs ${totalTaxable.toFixed(
      2
    )}`,
    {
      x: 340,
      y,
      size: 10,
      font,
    }
  );

  y -= 18;

  if (cgst > 0) {
    page.drawText(
      `CGST: Rs ${cgst.toFixed(2)}`,
      {
        x: 340,
        y,
        size: 10,
        font,
      }
    );

    y -= 18;

    page.drawText(
      `SGST: Rs ${sgst.toFixed(2)}`,
      {
        x: 340,
        y,
        size: 10,
        font,
      }
    );
  } else {
    page.drawText(
      `IGST: Rs ${igst.toFixed(2)}`,
      {
        x: 340,
        y,
        size: 10,
        font,
      }
    );
  }

  y -= 24;

  page.drawLine({
    start: {
      x: 330,
      y,
    },
    end: {
      x: 580,
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
      x: 340,
      y,
      size: 13,
      font: bold,
    }
  );

  /* ======================================== */
  /* ✍ FOOTER */
  /* ======================================== */

  y -= 60;

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

  y -= 40;

  page.drawText(
    "Authorized Signature",
    {
      x: 430,
      y,
      size: 10,
      font: bold,
    }
  );

  /* ======================================== */
  /* 💾 SAVE PDF */
  /* ======================================== */

  return await pdfDoc.save();
}