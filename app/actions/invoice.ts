import { supabaseAdmin } from "@/lib/supabase-admin";

export async function generateInvoices(order: any) {
  const {
    id,
    user_id,
    seller_id,
    reseller_id,
    base_price,
    selling_price,
    margin,
  } = order;

  // 🧾 CUSTOMER INVOICE
  await supabaseAdmin.from("invoices").insert({
    order_id: id,
    user_id,
    type: "customer",
    amount: selling_price,
    details: {
      base_price,
      margin,
      total: selling_price,
    },
  });

  // 🧾 SELLER INVOICE
  await supabaseAdmin.from("invoices").insert({
    order_id: id,
    user_id: seller_id,
    type: "seller",
    amount: base_price,
    details: {
      payout: base_price,
    },
  });

  // 🧾 RESELLER INVOICE
  await supabaseAdmin.from("invoices").insert({
    order_id: id,
    user_id: reseller_id,
    type: "reseller",
    amount: margin,
    details: {
      earnings: margin,
    },
  });
}