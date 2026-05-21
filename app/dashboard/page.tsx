import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  /* ✅ FIX */
  if (!profile) {
    return null; // prevent loop
  }

  if (error) {
    console.error("PROFILE ERROR:", error);
  }

  switch (profile.role) {
    case "admin":
      return redirect("/dashboard/admin");
    case "seller":
      return redirect("/dashboard/seller");
    case "customer":
      return redirect("/dashboard/user");
    default:
      return redirect("/");
  }
}