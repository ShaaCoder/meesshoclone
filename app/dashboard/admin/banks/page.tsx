import { supabaseAdmin } from "@/lib/supabase-admin";

import BankClient from "@/components/dashboard/admin/bank/BankClient";

export default async function AdminBankPage() {

  const { data: banks } =
    await supabaseAdmin
      .from("bank_accounts")
      .select(`
        *,

        users!bank_accounts_seller_id_fkey (
          name,
          email,
          phone
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  return (
    <BankClient
      banks={banks || []}
    />
  );
}