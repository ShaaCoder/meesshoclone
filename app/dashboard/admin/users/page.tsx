import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function Page() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return redirect("/login");
  }

  // 🚀 fetch all users (bypass RLS)
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("*");

  return <UsersClient users={users} />;
}