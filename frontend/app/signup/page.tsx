"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeProvider from "../components/ThemeProvider";
import ThemeToggle from "../components/ThemeToggle";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Signup failed");
      } else {
        setMessage("Signup successful 🎉 Redirecting...");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setMessage("Server error");
    }

    setLoading(false);
  };

  return (
    <ThemeProvider>
      <main
        className="app-shell"
        style={{ display: "grid", placeItems: "center", padding: 24 }}
      >
        <div
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: 470,
            padding: 34,
          }}
        >
          <div className="top-bar" style={{ alignItems: "center", marginBottom: 20 }}>
            <div>
              <div className="hero-badge">✦ PaperIQ</div>
              <h1 style={{ margin: "14px 0 0 0", fontSize: 36, fontWeight: 800 }}>
                Create account ✨
              </h1>
            </div>
            <ThemeToggle />
          </div>

          <p className="section-subtitle" style={{ marginBottom: 24 }}>
            Start your calm premium research workflow.
          </p>

          <div style={{ display: "grid", gap: 14 }}>
            <input
              className="input-area"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="input-area"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              className="input-area"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              className="input-area"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="primary-btn"
              style={{ width: "100%" }}
            >
              {loading ? "Creating..." : "Sign Up"}
            </button>

            {message && (
              <p style={{ margin: 0, textAlign: "center", color: "var(--primary-strong)" }}>
                {message}
              </p>
            )}
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}