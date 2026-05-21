"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    role: "customer",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  const handleSignup = async () => {
    setErrorMsg("");

    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.password
    ) {
      setErrorMsg("Please fill all fields");
      return;
    }

    if (form.password !== form.confirm) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setErrorMsg("Signup failed");
      setLoading(false);
      return;
    }

    /* 🧠 SAVE PROFILE */
    const { error: dbError } = await supabase.from("users").insert({
      id: user.id,
      email: form.email,
      name: form.name,
      phone: form.phone,
      role: form.role,
    });

    if (dbError) {
      console.error(dbError);
      setErrorMsg("Profile creation failed");
      return;
    }

    router.push("/login");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      
      {/* LEFT */}
      <div className="hidden md:flex flex-col justify-center px-16 gradient-primary text-white">
        <h1 className="text-4xl font-bold">Join us 🚀</h1>
        <p className="mt-4 text-white/80">
          Start your journey today.
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-md">

          <h2 className="text-2xl font-bold text-gray-800">
            Create Account
          </h2>

          {errorMsg && (
            <div className="mt-4 text-red-500 text-sm">{errorMsg}</div>
          )}

          <div className="mt-6 space-y-4">

            <input
              placeholder="Full Name"
              className="input"
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              placeholder="Phone"
              className="input"
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />

            <input
              type="email"
              placeholder="Email"
              className="input"
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Password"
              className="input"
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="input"
              onChange={(e) =>
                setForm({ ...form, confirm: e.target.value })
              }
            />

            <select
              className="input"
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
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