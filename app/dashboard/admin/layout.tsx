import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServer(); // ✅ use helper

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <div className="w-64 bg-black text-white p-5">
        <h2 className="text-xl font-bold mb-6">Admin</h2>

        <nav className="flex flex-col gap-4">
          <Link href="/dashboard/admin" className="hover:bg-gray-800 p-2 rounded">
            Dashboard
          </Link>

          <Link href="/dashboard/admin/users" className="hover:bg-gray-800 p-2 rounded">
            Users
          </Link>

          <Link href="/dashboard/admin/products" className="hover:bg-gray-800 p-2 rounded">
            Products
          </Link>

          <Link href="/dashboard/admin/orders" className="hover:bg-gray-800 p-2 rounded">
            Orders
          </Link>
           <Link href="/dashboard/admin/banks" className="hover:bg-gray-800 p-2 rounded">
            Banks
          </Link>
            <Link href="/dashboard/admin/withdraw" className="hover:bg-gray-800 p-2 rounded">
            Withdraw
          </Link>
          <Link href="/dashboard/admin/analytics" className="hover:bg-gray-800 p-2 rounded">
            Analytics
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 bg-gray-100">
        {children}
      </div>

    </div>
  );
}