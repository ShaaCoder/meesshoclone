import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import bwipjs from "bwip-js";

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
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 900]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 860;

  /* ================= SELLER ================= */
  page.drawText("Sold By:", { x: 50, y, size: 10, font: bold });
  y -= 15;

  page.drawText("Your Store Pvt Ltd", { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText("GSTIN: 07ABCDE1234F1Z5", { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText("Delhi, India - 110001", { x: 50, y, size: 10, font });

  /* ================= HEADER ================= */
  y -= 30;

  page.drawText("TAX INVOICE", {
    x: 230,
    y,
    size: 16,
    font: bold,
  });

  y -= 25;

  page.drawText(`Invoice: ${invoiceNumber}`, { x: 50, y, size: 10, font });
  page.drawText(`Order: ${order.order_code}`, { x: 300, y, size: 10, font });

  y -= 15;

  page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  /* ================= CUSTOMER ================= */
  y -= 25;

  page.drawText("Ship To:", { x: 50, y, size: 10, font: bold });
  y -= 15;

  page.drawText(order.name, { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText(order.phone, { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText(order.address, { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText(`${order.city}, ${order.state} - ${order.pincode}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  /* ================= BARCODE ================= */
  y -= 40;

  const awb = order.awb_code || order.id.slice(0, 10);

  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: awb,
      scale: 2,
      height: 10,
    });

    const image = await pdfDoc.embedPng(png);

    page.drawImage(image, {
      x: 350,
      y,
      width: 200,
      height: 60,
    });

    page.drawText(`AWB: ${awb}`, {
      x: 350,
      y: y - 15,
      size: 10,
      font,
    });
  } catch (err) {
    console.log("Barcode failed");
  }

  /* ================= TABLE HEADER ================= */
  y -= 80;

  page.drawText("Product", { x: 50, y, size: 10, font: bold });
  page.drawText("HSN", { x: 200, y, size: 10, font: bold });
  page.drawText("Qty", { x: 260, y, size: 10, font: bold });
  page.drawText("Price", { x: 310, y, size: 10, font: bold });
  page.drawText("GST", { x: 380, y, size: 10, font: bold });
  page.drawText("Total", { x: 450, y, size: 10, font: bold });

  y -= 15;

  let subtotal = 0;

  items.forEach((item) => {
    const total = item.quantity * item.price;
    subtotal += total;

    page.drawText(item.products?.name || "Product", {
      x: 50,
      y,
      size: 9,
      font,
    });

    page.drawText(item.hsn_code || "-", {
      x: 200,
      y,
      size: 9,
      font,
    });

    page.drawText(String(item.quantity), {
      x: 260,
      y,
      size: 9,
      font,
    });

    page.drawText(`Rs. ${item.price}`, {
      x: 310,
      y,
      size: 9,
      font,
    });

    page.drawText(`${item.gst_percent || 0}%`, {
      x: 380,
      y,
      size: 9,
      font,
    });

    page.drawText(`Rs. ${total}`, {
      x: 450,
      y,
      size: 9,
      font,
    });

    y -= 15;
  });

  /* ================= TOTAL ================= */
  y -= 10;

  const { totalGST, totalTaxable, cgst = 0, sgst = 0, igst = 0, grandTotal } =
    summary;

  page.drawText(`Taxable: Rs. ${totalTaxable.toFixed(2)}`, {
    x: 350,
    y,
    size: 10,
    font,
  });
  y -= 15;

  if (cgst > 0) {
    page.drawText(`CGST: Rs. ${cgst.toFixed(2)}`, { x: 350, y, size: 10, font });
    y -= 15;
    page.drawText(`SGST: Rs. ${sgst.toFixed(2)}`, { x: 350, y, size: 10, font });
  } else {
    page.drawText(`IGST: Rs. ${igst.toFixed(2)}`, { x: 350, y, size: 10, font });
  }

  y -= 20;

  page.drawText(`Total: Rs. ${grandTotal.toFixed(2)}`, {
    x: 350,
    y,
    size: 12,
    font: bold,
  });

  return await pdfDoc.save();
}