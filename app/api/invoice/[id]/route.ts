import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { generateInvoicePDF } from "@/lib/pdf/generateInvoicePDF";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {

    const { id } =
      await params;

    /* ============================= */
    /* 📦 FETCH ORDER */
    /* ============================= */

    const {
      data: order,
      error,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        addresses (*),

        order_items (
          *,
          products (*)
        )
      `)
      .eq("id", id)
      .single();

    /* ============================= */
    /* ❌ ERROR */
    /* ============================= */

    if (error) {

      console.log(
        "SUPABASE ERROR:",
        error
      );

      return new Response(
        error.message,
        {
          status: 500,
        }
      );
    }

    if (!order) {
      return new Response(
        "Invoice not found",
        {
          status: 404,
        }
      );
    }

    /* ============================= */
    /* 📦 ITEMS */
    /* ============================= */

    const items =
      order.order_items || [];

    /* ============================= */
    /* 💰 TAXABLE */
    /* ============================= */

    const taxable =
      items.reduce(
        (
          sum: number,
          item: any
        ) =>
          sum +
          Number(
            item.final_price ||
              0
          ) *
            Number(
              item.quantity ||
                0
            ),
        0
      );

    /* ============================= */
    /* 📄 PDF */
    /* ============================= */

    const pdfBytes =
      await generateInvoicePDF(
        order,
        items,
        order.order_code,
        {
          totalGST: 0,

          totalTaxable:
            taxable,

          grandTotal:
            Number(
              order.total_amount ||
                0
            ),
        }
      );

    /* ============================= */
    /* ✅ RETURN PDF */
    /* ============================= */

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename=${order.order_code}.pdf`,
        },
      }
    );

  } catch (error: any) {

    console.log(
      "PDF ROUTE ERROR:",
      error
    );

    return new Response(
      error.message ||
        "PDF generation failed",
      {
        status: 500,
      }
    );
  }
}