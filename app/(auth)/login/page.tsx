"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">

      {/* LEFT */}
      <div className="hidden md:flex flex-col justify-center px-16 gradient-primary text-white">
        <h1 className="text-4xl font-bold leading-tight">
          Welcome back 👋
        </h1>
        <p className="mt-4 text-white/80">
          Login and continue growing your business.
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">

          <h2 className="text-2xl font-bold text-gray-800">
            Login
          </h2>
          <p className="text-gray-500 mt-1">
            Enter your details below
          </p>

          <div className="mt-6 space-y-4">

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

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full gradient-primary text-white py-3 rounded-xl font-semibold"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-pink-600 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}