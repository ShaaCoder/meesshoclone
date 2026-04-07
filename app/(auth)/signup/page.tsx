"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);

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

    const { error: dbError } = await supabase.from("users").insert([
      {
        id: user.id,
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
    <div className="min-h-screen grid md:grid-cols-2">

      {/* LEFT */}
      <div className="hidden md:flex flex-col justify-center px-16 gradient-primary text-white">
        <h1 className="text-4xl font-bold leading-tight">
          Join us 🚀
        </h1>
        <p className="mt-4 text-white/80">
          Start your journey as a seller or customer.
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">

          <h2 className="text-2xl font-bold text-gray-800">
            Create Account
          </h2>
          <p className="text-gray-500 mt-1">
            Fill in your details
          </p>

          <div className="mt-6 space-y-4">

            <input
              type="text"
              placeholder="Full Name"
              className="input"
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Phone Number"
              className="input"
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              className="input"
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="input"
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              className="input"
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="customer">Customer</option>
              <option value="seller">Seller</option>
            </select>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full gradient-primary text-white py-3 rounded-xl font-semibold"
            >
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-pink-600 font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}