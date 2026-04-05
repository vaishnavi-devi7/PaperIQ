"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeProvider from "../components/ThemeProvider";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("test@gmail.com");
  const [password, setPassword] = useState("123456");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setMessage(data.detail || "Login failed");
      }
    } catch {
      setMessage("Error connecting to backend");
    } finally {
      setLoading(false);
    }
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
                Welcome back
              </h1>
            </div>
            <ThemeToggle />
          </div>

          <p className="section-subtitle" style={{ marginBottom: 24 }}>
            Step back into your calm AI workspace.
          </p>

          <div style={{ display: "grid", gap: 14 }}>
            <input
              type="email"
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

            <button
              onClick={handleLogin}
              disabled={loading}
              className="primary-btn"
              style={{ width: "100%" }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {message && (
              <p style={{ color: "#c2410c", margin: 0, textAlign: "center" }}>{message}</p>
            )}
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}