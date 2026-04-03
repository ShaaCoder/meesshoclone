"use client";

import { useState } from "react";
import {
  saveAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/app/actions/users";

export default function AddressClient({ addresses }: any) {
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-6">My Addresses</h1>

      {/* FORM */}
      <form action={saveAddress} className="space-y-2 mb-6 border p-4 rounded">
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <input
          name="name"
          defaultValue={editing?.name || ""}
          placeholder="Full Name"
          className="border p-2 w-full"
          required
        />

        <input
          name="phone"
          defaultValue={editing?.phone || ""}
          placeholder="Phone"
          className="border p-2 w-full"
          required
        />

        <input
          name="address"
          defaultValue={editing?.address_line || ""}
          placeholder="Address"
          className="border p-2 w-full"
          required
        />

        <input
          name="city"
          defaultValue={editing?.city || ""}
          placeholder="City"
          className="border p-2 w-full"
          required
        />

        <input
          name="state"
          defaultValue={editing?.state || ""}
          placeholder="State"
          className="border p-2 w-full"
          required
        />

        <input
          name="pincode"
          defaultValue={editing?.pincode || ""}
          placeholder="Pincode"
          className="border p-2 w-full"
          required
        />

        <button className="bg-black text-white px-4 py-2 w-full">
          {editing ? "Update Address" : "Add Address"}
        </button>
      </form>

      {/* ADDRESS LIST */}
      <div className="space-y-3">
        {addresses.length === 0 && (
          <p className="text-gray-500">No addresses found</p>
        )}

        {addresses.map((addr: any) => (
          <div key={addr.id} className="border p-4 rounded">
            <p className="font-medium">
              {addr.name} ({addr.phone})
            </p>
            <p>{addr.address_line}</p>
            <p>
              {addr.city}, {addr.state} - {addr.pincode}
            </p>

            {addr.is_default && (
              <span className="text-green-600 text-sm">Default</span>
            )}

            <div className="flex gap-3 mt-2">
              {/* EDIT */}
              <button
                onClick={() => setEditing(addr)}
                className="text-blue-600 text-sm"
              >
                Edit
              </button>

              {/* DELETE */}
              <form action={deleteAddress}>
                <input type="hidden" name="id" value={addr.id} />
                <button className="text-red-600 text-sm">
                  Delete
                </button>
              </form>

              {/* SET DEFAULT */}
              {!addr.is_default && (
                <form action={setDefaultAddress}>
                  <input type="hidden" name="id" value={addr.id} />
                  <button className="text-green-600 text-sm">
                    Make Default
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}