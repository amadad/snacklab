"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [seller, setSeller] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, seller: seller.trim().toUpperCase() }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setError(data?.error ?? "Could not sign in.");
        setPassword("");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-peach/30 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl p-8 border-2 border-pink-light shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-chocolate text-center">🍫 Snack Lab</h1>
        <p className="text-sm text-caramel text-center">Seller sign-in</p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-chocolate uppercase tracking-wide">Your code</label>
          <input
            type="text"
            value={seller}
            onChange={(e) => setSeller(e.target.value.toUpperCase())}
            placeholder="e.g. ZAIN"
            className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none uppercase font-mono tracking-widest"
            autoFocus
            autoComplete="off"
            disabled={loading}
            maxLength={12}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-chocolate uppercase tracking-wide">Store password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
            disabled={loading}
          />
        </div>

        {error && <p className="text-pink-bold text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !seller.trim() || !password.trim()}
          className="w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors disabled:opacity-60"
        >
          {loading ? "Signing In..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
