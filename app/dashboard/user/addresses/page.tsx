import { getSupabaseServer } from "@/lib/supabase-server";
import AddressClient from "@/components/dashboard/users/AddressClient";

export default async function AddressPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Not logged in</div>;

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <AddressClient addresses={addresses || []} />;
}