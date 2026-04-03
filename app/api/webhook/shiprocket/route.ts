import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json();

  const { awb, current_status } = body;

  let status = "shipped";

  if (current_status === "DELIVERED") {
    status = "delivered";
  }

  await supabaseAdmin
    .from("orders")
    .update({
      status,
      delivered_at: status === "delivered" ? new Date() : null,
    })
    .eq("awb_code", awb);

  return Response.json({ success: true });
}