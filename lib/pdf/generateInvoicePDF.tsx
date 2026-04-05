import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import bwipjs from "bwip-js";

export async function generateInvoicePDF(order: any, items: any[], invoiceNumber: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 900]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 860;

  /* ================= SELLER BLOCK ================= */
  page.drawText("Sold By:", { x: 50, y, size: 10, font: bold });
  y -= 15;

  page.drawText("Your Store Pvt Ltd", { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText("GSTIN: 07ABCDE1234F1Z5", { x: 50, y, size: 10, font });
  y -= 12;
  page.drawText("Delhi, India - 110001", { x: 50, y, size: 10, font });

  /* ================= INVOICE HEADER ================= */
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

  /* ================= AWB BARCODE ================= */
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

  /* ================= ITEMS ================= */
  y -= 80;

  page.drawText("Product", { x: 50, y, size: 10, font: bold });
  page.drawText("Qty", { x: 300, y, size: 10, font: bold });
  page.drawText("Price", { x: 350, y, size: 10, font: bold });
  page.drawText("Total", { x: 450, y, size: 10, font: bold });

  y -= 15;

  let subtotal = 0;

  items.forEach((item) => {
    const total = item.quantity * item.price;
    subtotal += total;

    page.drawText(item.products?.name || "Product", {
      x: 50,
      y,
      size: 10,
      font,
    });

    page.drawText(String(item.quantity), {
      x: 300,
      y,
      size: 10,
      font,
    });

    page.drawText(`Rs. ${item.price}`, {
      x: 350,
      y,
      size: 10,
      font,
    });

    page.drawText(`Rs. ${total}`, {
      x: 450,
      y,
      size: 10,
      font,
    });

    y -= 15;
  });

  /* ================= TOTAL ================= */
  y -= 10;

  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  page.drawText(`Subtotal: Rs. ${subtotal}`, { x: 350, y, size: 10, font });
  y -= 15;
  page.drawText(`GST: Rs. ${gst.toFixed(2)}`, { x: 350, y, size: 10, font });
  y -= 15;
  page.drawText(`Total: Rs. ${total.toFixed(2)}`, {
    x: 350,
    y,
    size: 12,
    font: bold,
  });

  return await pdfDoc.save();
}