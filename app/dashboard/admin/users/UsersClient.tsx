"use client";

import { useTransition } from "react";
import {
  updateUserRole,
  deleteUser,
  updateUserStatus, // 👈 new (you will add this next)
} from "@/app/actions/admin";
import { useRouter } from "next/navigation";

export default function UsersClient({ users }: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users Management</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th> {/* 👈 new */}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id} className="border-t">

                <td className="p-3">{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>

                {/* ROLE */}
                <td>
                  <select
                    defaultValue={user.role}
                    disabled={isPending}
                    onChange={(e) => {
                      const newRole = e.target.value;

                      startTransition(() =>
                        handleAction(() =>
                          updateUserRole(user.id, newRole)
                        )
                      );
                    }}
                    className="border p-1 rounded"
                  >
                    <option value="customer">Customer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>

                {/* STATUS */}
                <td>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      user.status === "approved"
                        ? "bg-green-100 text-green-600"
                        : user.status === "pending"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {user.status || "N/A"}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="space-x-2">

                  {/* 🔥 Seller Approval System */}
                  {user.role === "seller" && user.status === "pending" && (
                    <>
                      <button
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() =>
                            handleAction(() =>
                              updateUserStatus(user.id, "approved")
                            )
                          )
                        }
                        className="bg-green-500 text-white px-2 py-1 rounded"
                      >
                        Approve
                      </button>

                      <button
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() =>
                            handleAction(() =>
                              updateUserStatus(user.id, "rejected")
                            )
                          )
                        }
                        className="bg-yellow-500 text-white px-2 py-1 rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {/* 🔁 Quick role buttons */}
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() =>
                        handleAction(() =>
                          updateUserRole(user.id, "seller")
                        )
                      )
                    }
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Seller
                  </button>

                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() =>
                        handleAction(() =>
                          updateUserRole(user.id, "admin")
                        )
                      )
                    }
                    className="bg-purple-500 text-white px-2 py-1 rounded"
                  >
                    Admin
                  </button>

                  {/* ❌ Delete */}
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() =>
                        handleAction(() =>
                          deleteUser(user.id)
                        )
                      )
                    }
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPending && (
        <p className="mt-4 text-gray-500">Updating...</p>
      )}
    </div>
  );
}