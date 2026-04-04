import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateInvoicePDF(
  order: any,
  items: any[],
  invoiceNumber: string
) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);

  /* ✅ DEFAULT FONT */
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 760;

  /* ================= HEADER ================= */
  page.drawText("TAX INVOICE", {
    x: 220,
    y,
    size: 18,
    font: boldFont,
  });

  y -= 30;

  page.drawText(`Invoice No: ${invoiceNumber}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
    x: 400,
    y,
    size: 10,
    font,
  });

  y -= 25;

  page.drawText(`Order ID: ${order.order_code}`, {
    x: 50,
    y,
    size: 10,
    font,
  });

  /* ================= CUSTOMER ================= */
  y -= 40;

  page.drawText("BILL TO:", {
    x: 50,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 20;

  page.drawText(order.name || "-", { x: 50, y, size: 10, font });
  y -= 15;

  page.drawText(order.phone || "-", { x: 50, y, size: 10, font });
  y -= 15;

  page.drawText(order.address || "-", { x: 50, y, size: 10, font });
  y -= 15;

  page.drawText(
    `${order.city}, ${order.state} - ${order.pincode}`,
    { x: 50, y, size: 10, font }
  );

  /* ================= ITEMS ================= */
  y -= 40;

  page.drawText("Product", { x: 50, y, size: 11, font: boldFont });
  page.drawText("Qty", { x: 300, y, size: 11, font: boldFont });
  page.drawText("Price", { x: 350, y, size: 11, font: boldFont });
  page.drawText("Total", { x: 450, y, size: 11, font: boldFont });

  y -= 20;

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

    /* ✅ FIX: use Rs. instead of ₹ */
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

    y -= 20;
  });

  /* ================= TOTAL ================= */
  y -= 20;

  page.drawLine({
    start: { x: 50, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 20;

  page.drawText("Subtotal:", { x: 350, y, size: 11, font });
  page.drawText(`Rs. ${subtotal}`, { x: 450, y, size: 11, font });

  y -= 20;

  const gst = subtotal * 0.18;

  page.drawText("GST (18%):", { x: 350, y, size: 11, font });
  page.drawText(`Rs. ${gst.toFixed(2)}`, { x: 450, y, size: 11, font });

  y -= 20;

  const grandTotal = subtotal + gst;

  page.drawText("Total:", {
    x: 350,
    y,
    size: 13,
    font: boldFont,
  });

  page.drawText(`Rs. ${grandTotal.toFixed(2)}`, {
    x: 450,
    y,
    size: 13,
    font: boldFont,
  });

  /* ================= FOOTER ================= */
  y -= 40;

  page.drawText(
    "This is a computer generated invoice. No signature required.",
    {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}