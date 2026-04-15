import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Landmark,
  Wallet,
  BarChart3,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/logout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      
      {/* 🔥 SIDEBAR */}
      <aside className="w-64 bg-gradient-to-b from-gray-900 to-black text-white flex flex-col justify-between p-5">

        {/* TOP */}
        <div>
          {/* LOGO */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold">⚡ Admin Panel</h2>
            <p className="text-gray-400 text-sm">Marketplace Control</p>
          </div>

          {/* NAV */}
          <nav className="flex flex-col gap-2">
            <SidebarItem href="/dashboard/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <SidebarItem href="/dashboard/admin/users" icon={<Users size={18} />} label="Users" />
            <SidebarItem href="/dashboard/admin/products" icon={<Package size={18} />} label="Products" />
            <SidebarItem href="/dashboard/admin/orders" icon={<ShoppingCart size={18} />} label="Orders" />
            <SidebarItem href="/dashboard/admin/banks" icon={<Landmark size={18} />} label="Banks" />
            <SidebarItem href="/dashboard/admin/withdraw" icon={<Wallet size={18} />} label="Withdraw" />
            <SidebarItem href="/dashboard/admin/analytics" icon={<BarChart3 size={18} />} label="Analytics" />
          </nav>
        </div>

        {/* 🔥 PROFILE SECTION */}
        <div className="border-t border-gray-800 pt-4">

          {/* USER INFO */}
          <div className="flex items-center gap-3 mb-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
              {profile?.name?.charAt(0) || "A"}
            </div>

            {/* Name + Email */}
            <div>
              <p className="text-sm font-semibold">
                {profile?.name || "Admin"}
              </p>
              <p className="text-xs text-gray-400">
                {user.email}
              </p>
            </div>
          </div>

          {/* LOGOUT BUTTON */}
          <form action={logout}>
            <button className="w-full flex items-center gap-2 text-sm bg-white/10 hover:bg-red-500/80 transition px-3 py-2 rounded-xl">
              <LogOut size={16} />
              Logout
            </button>
          </form>

        </div>

      </aside>

      {/* CONTENT */}
      <main className="flex-1 bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}

/* SIDEBAR ITEM */
function SidebarItem({ href, icon, label }: any) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-all"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}