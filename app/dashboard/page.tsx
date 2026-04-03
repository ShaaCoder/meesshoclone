import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function DashboardPage() {
const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ❌ Not logged in
  if (!user) {
    return redirect("/login");
  }

console.log("USER ID:", user?.id);

const { data: profile, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", user.id)
  .single();

console.log("PROFILE:", profile);
console.log("ERROR:", error);
  // ❌ Profile missing OR RLS blocking
  if (error || !profile) {
    console.log("PROFILE ERROR:", error);
    return redirect("/login");
  }

  // ✅ Clean routing
  switch (profile.role) {
    case "admin":
      return redirect("/dashboard/admin");
    case "seller":
      return redirect("/dashboard/seller");
    case "customer":
      return redirect("/dashboard/user");
    default:
      return redirect("/login");
  }
}