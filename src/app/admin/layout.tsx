"use client";

import { useState, ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      setError(true);
      setPassword("");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-peach/30 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl p-8 border-2 border-pink-light shadow-md w-80 space-y-4"
        >
          <h1 className="text-2xl font-bold text-chocolate text-center">Snack Lab Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            className="w-full border-2 border-pink-light rounded-lg px-3 py-2 focus:border-pink-bold focus:outline-none"
            autoFocus
          />
          {error && (
            <p className="text-pink-bold text-sm text-center">Wrong password</p>
          )}
          <button
            type="submit"
            className="w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
