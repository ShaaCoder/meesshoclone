"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);

    // 🔐 Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      alert("Signup failed");
      setLoading(false);
      return;
    }

    // 🔥 Update extra data in users table
    const { error: dbError } = await supabase.from("users").insert([
  {
    id: user.id, // 🔥 MOST IMPORTANT
    email,
    name,
    phone,
    role,
  },
]);

    if (dbError) {
      console.error(dbError);
      alert("User created but profile update failed");
    }

    alert("Account created successfully 🎉");

    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        
        <h1 className="text-3xl font-bold text-center text-pink-600">
          Create Account
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Start your journey 🚀
        </p>

        <div className="mt-6 space-y-4">

          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setName(e.target.value)}
          />

          {/* Phone */}
          <input
            type="text"
            placeholder="Phone Number"
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Enter email"
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Enter password"
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Role Selection */}
          <select
            className="w-full border p-3 rounded-lg"
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="seller">Seller</option>
          </select>

          {/* Button */}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-pink-600 text-white p-3 rounded-lg"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </div>

        <p className="text-sm text-center mt-6 text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-pink-600 font-semibold">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}