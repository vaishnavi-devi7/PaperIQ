"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full px-4 py-2 text-sm font-semibold transition"
      style={{
        background: "var(--card-soft)",
        color: "var(--text)",
        border: "1px solid var(--border)",
      }}
    >
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}