"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      /* ✅ SINGLE ENTRY POINT */
      router.replace("/dashboard");

      /* 🔥 FORCE SERVER RE-EVAL */
      router.refresh();
    } catch (err: any) {
      setErrorMsg("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      
      {/* LEFT */}
      <div className="hidden md:flex flex-col justify-center px-16 gradient-primary text-white">
        <h1 className="text-4xl font-bold">Welcome back 👋</h1>
        <p className="mt-4 text-white/80">
          Login to continue shopping or managing your store.
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-md">

          <h2 className="text-2xl font-bold text-gray-800">Login</h2>

          {errorMsg && (
            <div className="mt-4 text-red-500 text-sm">{errorMsg}</div>
          )}

          <div className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="input"
              value={password}
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