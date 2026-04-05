"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeProvider from "../components/ThemeProvider";
import FloatingNav from "../components/FloatingNav";

type ComparedDocument = {
  filename: string;
  text: string;
  summary: string;
  keywords: string[];
  scores: {
    Language: number;
    Coherence: number;
    Reasoning: number;
    Sophistication: number;
    Readability: number;
    Composite: number;
  };
  stats: {
    word_count: number;
    sentence_count: number;
    avg_sentence_len: number;
    avg_word_len: number;
    vocab_diversity: number;
    complex_word_ratio: number;
  };
};

type KeywordMatrixRow = {
  keyword: string;
  presence: Record<string, boolean>;
};

type CompareResponse = {
  documents: ComparedDocument[];
  literature_map: {
    shared_topics: string[];
    unique_topics: Record<string, string[]>;
  };
  keyword_matrix: KeywordMatrixRow[];
};

export default function ComparePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<CompareResponse | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleFilesChange = (fileList: FileList | null) => {
    if (!fileList) return;

    const files = Array.from(fileList).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    if (files.length === 0) {
      setMessage("Please choose PDF files only.");
      setSelectedFiles([]);
      return;
    }

    if (files.length > 3) {
      setMessage("Please select only 2 or 3 PDF files.");
      setSelectedFiles(files.slice(0, 3));
      return;
    }

    setMessage("");
    setSelectedFiles(files);
  };

  const removeFile = (name: string) => {
    const updated = selectedFiles.filter((file) => file.name !== name);
    setSelectedFiles(updated);
  };

  const handleCompare = async () => {
    if (selectedFiles.length < 2 || selectedFiles.length > 3) {
      setMessage("Please select 2 or 3 PDF files.");
      return;
    }

    setLoading(true);
    setMessage("");
    setResults(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("http://127.0.0.1:8000/compare", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Comparison failed.");
        return;
      }

      setResults(data);
      setMessage("Documents compared successfully.");
    } catch {
      setMessage("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    "Composite",
    "Language",
    "Coherence",
    "Reasoning",
    "Sophistication",
    "Readability",
  ] as const;

  return (
    <ThemeProvider>
      <main className="app-shell">
        <div className="app-container">
          <div style={{ marginBottom: 24 }}>
            <FloatingNav showDashboardLinks onLogout={handleLogout} />
          </div>

          <div className="top-bar" style={{ marginTop: 10 }}>
            <div>
              <div className="brand-badge">Multi-Document Comparison</div>
              <h1 className="hero-title" style={{ fontSize: 50 }}>
                Compare 2 to 3 research papers
              </h1>
              <p className="hero-subtitle" style={{ maxWidth: 760 }}>
                Compare summaries, scores, keywords, shared topics, and unique ideas side by side.
              </p>
            </div>
          </div>

          <div className="glass-card" style={{ marginTop: 28, padding: 30 }}>
            <h2 className="section-title">Upload PDFs</h2>
            <p className="section-subtitle" style={{ marginTop: 10 }}>
              Select exactly 2 or 3 PDF files for comparison.
            </p>

            <div style={{ marginTop: 24, display: "grid", gap: 18 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => handleFilesChange(e.target.files)}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="secondary-btn"
                style={{
                  justifyContent: "flex-start",
                  minHeight: 72,
                  borderRadius: 22,
                  fontSize: 18,
                  padding: "18px 22px",
                }}
              >
                {selectedFiles.length === 0
                  ? "Choose 2 or 3 PDF files"
                  : `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`}
              </button>

              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                On Mac, hold <b>Command (⌘)</b> while selecting to choose multiple files at once.
              </p>

              {selectedFiles.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {selectedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="feature-card"
                      style={{
                        padding: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {file.name}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="secondary-btn"
                        style={{ padding: "10px 14px" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-row">
                <button
                  onClick={handleCompare}
                  disabled={loading}
                  className="primary-btn"
                  style={{ opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Comparing..." : "Compare Documents"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedFiles([]);
                    setResults(null);
                    setMessage("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  Clear
                </button>
              </div>

              {message && (
                <p style={{ color: "var(--primary-strong)", fontWeight: 600, margin: 0 }}>
                  {message}
                </p>
              )}
            </div>
          </div>

          {results && (
            <>
              <div className="glass-card" style={{ marginTop: 28, padding: 30 }}>
                <h2 className="section-title">Score Comparison</h2>
                <div style={{ overflowX: "auto", marginTop: 18 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Metric</th>
                        {results.documents.map((doc) => (
                          <th key={doc.filename} style={thStyle}>
                            {doc.filename}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr key={metric}>
                          <td style={tdLabelStyle}>{metric}</td>
                          {results.documents.map((doc) => (
                            <td key={`${doc.filename}-${metric}`} style={tdStyle}>
                              {doc.scores[metric]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  marginTop: 28,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 20,
                }}
              >
                {results.documents.map((doc) => (
                  <div key={doc.filename} className="glass-card" style={{ padding: 24 }}>
                    <p className="stat-label">Document</p>
                    <h3 style={{ marginTop: 10, fontSize: 22, overflowWrap: "anywhere" }}>
                      {doc.filename}
                    </h3>

                    <p style={{ marginTop: 14, lineHeight: 1.8 }}>
                      {doc.summary}
                    </p>

                    <div className="flex-row" style={{ marginTop: 14 }}>
                      {doc.keywords.map((kw) => (
                        <span key={`${doc.filename}-${kw}`} className="tag-chip">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ marginTop: 28, padding: 30 }}>
                <h2 className="section-title">Shared Topics</h2>
                <div className="flex-row" style={{ marginTop: 18 }}>
                  {results.literature_map.shared_topics.length > 0 ? (
                    results.literature_map.shared_topics.map((topic) => (
                      <span key={topic} className="tag-chip">
                        {topic}
                      </span>
                    ))
                  ) : (
                    <p className="section-subtitle" style={{ margin: 0 }}>
                      No strong shared topics detected.
                    </p>
                  )}
                </div>
              </div>

              <div className="glass-card" style={{ marginTop: 28, padding: 30 }}>
                <h2 className="section-title">Unique Topics by Document</h2>
                <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
                  {Object.entries(results.literature_map.unique_topics).map(([filename, topics]) => (
                    <div key={filename} className="feature-card" style={{ padding: 22 }}>
                      <h3 style={{ margin: 0, fontSize: 22, overflowWrap: "anywhere" }}>
                        {filename}
                      </h3>

                      <div className="flex-row" style={{ marginTop: 14 }}>
                        {topics.length > 0 ? (
                          topics.map((topic) => (
                            <span key={`${filename}-${topic}`} className="tag-chip">
                              {topic}
                            </span>
                          ))
                        ) : (
                          <p className="section-subtitle" style={{ margin: 0 }}>
                            No clearly unique topics.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card" style={{ marginTop: 28, padding: 30 }}>
                <h2 className="section-title">Keyword Matrix</h2>
                <div style={{ overflowX: "auto", marginTop: 18 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Keyword</th>
                        {results.documents.map((doc) => (
                          <th key={`matrix-${doc.filename}`} style={thStyle}>
                            {doc.filename}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.keyword_matrix.slice(0, 30).map((row) => (
                        <tr key={row.keyword}>
                          <td style={tdLabelStyle}>{row.keyword}</td>
                          {results.documents.map((doc) => (
                            <td key={`${row.keyword}-${doc.filename}`} style={tdStyle}>
                              {row.presence[doc.filename] ? "✓" : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </ThemeProvider>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--border)",
  textAlign: "center",
};

const tdLabelStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 700,
  whiteSpace: "nowrap",
};