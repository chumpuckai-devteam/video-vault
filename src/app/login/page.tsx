"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/admin";
      return;
    }

    const data = await res.json();
    setError(data.error || "Invalid password");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter the admin password to access the Video Vault dashboard.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
