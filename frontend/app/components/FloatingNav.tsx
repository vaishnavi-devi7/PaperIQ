"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

type FloatingNavProps = {
  showAuthLinks?: boolean;
  showDashboardLinks?: boolean;
  onLogout?: () => void;
};

export default function FloatingNav({
  showAuthLinks = false,
  showDashboardLinks = false,
  onLogout,
}: FloatingNavProps) {
  return (
    <div
      className="floating-nav"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        padding: 18,
        borderRadius: 28,
      }}
    >
      <div
        className="floating-nav-left"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" className="brand-badge">
          ✦ PaperIQ
        </Link>

        {showAuthLinks && (
          <>
            <Link href="/login" className="secondary-btn" style={{ padding: "10px 16px" }}>
              Login
            </Link>
            <Link href="/signup" className="secondary-btn" style={{ padding: "10px 16px" }}>
              Signup
            </Link>
          </>
        )}

        {showDashboardLinks && (
          <>
            <Link href="/dashboard" className="secondary-btn" style={{ padding: "10px 16px" }}>
              Dashboard
            </Link>
            <Link href="/upload" className="secondary-btn" style={{ padding: "10px 16px" }}>
              Workspace
            </Link>
            <Link href="/compare" className="secondary-btn" style={{ padding: "10px 16px" }}>
              Compare
            </Link>
          </>
        )}
      </div>

      <div
        className="floating-nav-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <ThemeToggle />
        {onLogout && (
          <button
            className="secondary-btn"
            onClick={onLogout}
            style={{ padding: "10px 16px" }}
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}