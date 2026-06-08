"use client";

import { useState } from "react";
import Image from "next/image";
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleLogin} className="lab-panel w-full max-w-sm space-y-5 p-7">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="Snack Lab"
            width={200}
            height={196}
            priority
            className="mx-auto h-16 w-auto"
          />
          <p className="lab-label mt-3">Staff access · restricted</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-seller" className="lab-label block">Your code</label>
          <input
            id="login-seller"
            type="text"
            value={seller}
            onChange={(e) => setSeller(e.target.value.toUpperCase())}
            placeholder="e.g. ZAIN"
            className="lab-field lab-mono uppercase tracking-[0.2em]"
            autoFocus
            autoComplete="off"
            disabled={loading}
            maxLength={12}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="lab-label block">Store password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="lab-field"
            disabled={loading}
          />
        </div>

        {error && (
          <p role="alert" className="lab-mono text-center text-sm text-hazard">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !seller.trim() || !password.trim()}
          className="lab-btn lab-btn-primary w-full"
        >
          {loading ? "Signing in…" : "Enter lab"}
        </button>
      </form>
    </div>
  );
}
