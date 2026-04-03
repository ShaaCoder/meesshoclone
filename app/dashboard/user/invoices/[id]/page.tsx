import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { InvoicePDF } from "@/lib/pdf/InvoicePdf";
import { renderToStream } from "@react-pdf/renderer";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" });
  }

  // 🔒 SECURITY CHECK
  if (invoice.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" });
  }

  const stream = await renderToStream(
    <InvoicePDF invoice={invoice} />
  );

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice-${invoice.id}.pdf`,
    },
  });
}