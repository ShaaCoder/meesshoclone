"use client";

import { useState, useTransition } from "react";
import {
  updateUserRole,
  deleteUser,
  updateUserStatus,
} from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import {
  Search,
  Trash2,
  Shield,
  UserCheck,
  X,
} from "lucide-react";

export default function UsersClient({ users }: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleAction = async (action: () => Promise<void>) => {
    await action();
    router.refresh();
  };

  /* FILTER */
  const filtered = users?.filter((u: any) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* STATS */
  const total = users.length;
  const sellers = users.filter((u: any) => u.role === "seller").length;
  const pending = users.filter((u: any) => u.status === "pending").length;

  return (
    <div className="space-y-6">

      {/* 🔥 STATS */}
      <div className="grid grid-cols-3 gap-4">
        <Stat title="Total Users" value={total} />
        <Stat title="Sellers" value={sellers} />
        <Stat title="Pending" value={pending} />
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Users 👥</h1>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            className="pl-10 pr-4 py-2 border rounded-xl"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* USERS */}
      <div className="bg-white rounded-2xl border divide-y">

        {filtered.map((user: any) => (
          <div
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className="flex justify-between items-center p-4 hover:bg-gray-50 cursor-pointer"
          >

            {/* LEFT */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                {user.name?.charAt(0)}
              </div>

              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>

            {/* ROLE BADGE */}
            <RoleBadge role={user.role} />

            {/* STATUS */}
            <StatusBadge status={user.status} />

            {/* ACTIONS */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex gap-2"
            >

              {/* 🔥 ROLE DROPDOWN (FIXED UX) */}
              <select
                defaultValue={user.role}
                onChange={(e) =>
                  startTransition(() =>
                    handleAction(() =>
                      updateUserRole(user.id, e.target.value)
                    )
                  )
                }
                className="border px-2 py-1 rounded"
              >
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>

              {/* APPROVE */}
              {user.status === "pending" && (
                <button
                  onClick={() =>
                    startTransition(() =>
                      handleAction(() =>
                        updateUserStatus(user.id, "approved")
                      )
                    )
                  }
                  className="bg-green-100 text-green-600 p-2 rounded"
                >
                  <UserCheck size={14} />
                </button>
              )}

              {/* DELETE */}
              <button
                onClick={() =>
                  startTransition(() =>
                    handleAction(() => deleteUser(user.id))
                  )
                }
                className="bg-red-100 text-red-600 p-2 rounded"
              >
                <Trash2 size={14} />
              </button>

            </div>
          </div>
        ))}

      </div>

      {/* 🔥 MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 w-[400px] relative">

            <button
              onClick={() => setSelectedUser(null)}
              className="absolute right-4 top-4"
            >
              <X />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-indigo-500 text-white flex items-center justify-center rounded-full text-xl">
                {selectedUser.name?.charAt(0)}
              </div>

              <h2 className="text-xl font-bold">
                {selectedUser.name}
              </h2>

              <p className="text-gray-500">
                {selectedUser.email}
              </p>

              <RoleBadge role={selectedUser.role} />
              <StatusBadge status={selectedUser.status} />

              {/* ROLE CHANGE INSIDE MODAL */}
              <select
                defaultValue={selectedUser.role}
                onChange={(e) =>
                  startTransition(() =>
                    handleAction(() =>
                      updateUserRole(selectedUser.id, e.target.value)
                    )
                  )
                }
                className="border w-full px-3 py-2 rounded-xl mt-4"
              >
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* STAT CARD */
function Stat({ title, value }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-xl font-bold">{value}</h2>
    </div>
  );
}

/* ROLE BADGE */
function RoleBadge({ role }: any) {
  if (role === "admin")
    return <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs">Admin</span>;

  if (role === "seller")
    return <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">Seller</span>;

  return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Customer</span>;
}

/* STATUS BADGE */
function StatusBadge({ status }: any) {
  if (status === "approved")
    return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs">Approved</span>;

  if (status === "pending")
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">Pending</span>;

  if (status === "rejected")
    return <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs">Rejected</span>;

  return null;
}