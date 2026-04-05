"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeProvider from "../components/ThemeProvider";
import FloatingNav from "../components/FloatingNav";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type UploadedPaper = {
  filename: string;
  preview: string;
  uploadedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [paper, setPaper] = useState<UploadedPaper | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }

    const storedPaper = localStorage.getItem("uploadedPaper");
    if (storedPaper) {
      try {
        setPaper(JSON.parse(storedPaper));
      } catch {
        localStorage.removeItem("uploadedPaper");
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const goToWorkspace = () => {
    router.push("/upload");
  };

  const clearPaper = () => {
    localStorage.removeItem("uploadedPaper");
    setPaper(null);
  };

  const paperStats = useMemo(() => {
    if (!paper?.preview) {
      return { wordCount: 0, charCount: 0 };
    }

    const words = paper.preview.trim().split(/\s+/).filter(Boolean);

    return {
      wordCount: words.length,
      charCount: paper.preview.length,
    };
  }, [paper]);

  if (!user) return null;

  return (
    <ThemeProvider>
      <main className="app-shell">
        <div className="app-container">
          <FloatingNav showDashboardLinks onLogout={handleLogout} />

          <div className="top-bar" style={{ marginTop: 10 }}>
            <div>
              <div className="brand-badge">Dashboard</div>
              <h1 className="hero-title" style={{ fontSize: 50 }}>
                Welcome, {user.name} 👋
              </h1>
              <p className="hero-subtitle" style={{ maxWidth: 620 }}>
                Your calm premium workspace is ready.
              </p>
            </div>
          </div>

          <div className="grid-3" style={{ marginTop: 28 }}>
            <div className="stat-card">
              <p className="stat-label">User</p>
              <div className="stat-value">{user.name}</div>
            </div>

            <div className="stat-card">
              <p className="stat-label">Email</p>
              <div className="stat-value" style={{ fontSize: 24, wordBreak: "break-word" }}>
                {user.email}
              </div>
            </div>

            <div className="stat-card">
              <p className="stat-label">Role</p>
              <div className="stat-value">{user.role}</div>
            </div>
          </div>

          <div className="flex-row" style={{ marginTop: 24 }}>
            <button className="primary-btn" onClick={goToWorkspace}>
              Open AI Workspace 📄
            </button>

            {paper && (
              <button className="secondary-btn" onClick={clearPaper}>
                Clear Paper
              </button>
            )}
          </div>

          <div className="glass-card" style={{ marginTop: 30, padding: 30 }}>
            <h2 className="section-title">Paper status</h2>

            {!paper ? (
              <div className="empty-state" style={{ marginTop: 20 }}>
                <div>
                  <h3 className="empty-state-title">No paper uploaded yet</h3>
                  <p className="empty-state-text">
                    Open the workspace and upload a PDF to begin your AI analysis flow.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 24 }}>
                <div>
                  <p className="stat-label">Uploaded file</p>
                  <h3 style={{ marginTop: 12, fontSize: 32 }}>{paper.filename}</h3>
                  <p className="section-subtitle" style={{ marginTop: 8 }}>
                    {new Date(paper.uploadedAt).toLocaleString()}
                  </p>
                </div>

                <div className="grid-2" style={{ marginTop: 24 }}>
                  <div className="soft-card" style={{ padding: 22 }}>
                    <p className="stat-label">Preview words</p>
                    <div className="stat-value">{paperStats.wordCount}</div>
                  </div>

                  <div className="soft-card" style={{ padding: 22 }}>
                    <p className="stat-label">Preview characters</p>
                    <div className="stat-value">{paperStats.charCount}</div>
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <p className="stat-label" style={{ marginBottom: 12 }}>
                    Preview
                  </p>
                  <div className="preview-box">{paper.preview}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}