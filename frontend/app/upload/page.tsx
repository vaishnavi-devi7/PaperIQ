"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ThemeProvider from "../components/ThemeProvider";
import FloatingNav from "../components/FloatingNav";
import LoadingCard from "../components/LoadingCard";

type UploadResponse = {
  message?: string;
  filename?: string;
  preview?: string;
  title?: string;
  summary?: string;
  keywords?: string[];
  scores?: {
    Language: number;
    Coherence: number;
    Reasoning: number;
    Sophistication: number;
    Readability: number;
    Composite: number;
  };
  stats?: {
    word_count: number;
    sentence_count: number;
    avg_sentence_len: number;
    avg_word_len: number;
    vocab_diversity: number;
    complex_word_ratio: number;
  };
  sections?: Record<string, string>;
  completeness?: Record<string, Record<string, string>>;
  long_sentences?: {
    sentence: string;
    word_count: string;
    suggestion: string;
  }[];
  vocab_suggestions?: {
    weak: string;
    better: string;
    location: string;
  }[];
  sentiment?: {
    polarity: number;
    label: string;
  };
  score_trends?: {
    metric: string;
    value: number;
  }[];
  keyword_frequency?: {
    keyword: string;
    count: number;
  }[];
  research_gaps?: string[];
  chunks_indexed?: number;
  detail?: string;
};

type AskResponse = {
  answer?: string;
  citations?: string[];
  detail?: string;
};

type ChatItem = {
  id?: number;
  question: string;
  answer: string;
};

type StoredPaper = {
  filename: string;
  preview: string;
  uploadedAt: string;
  title: string;
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
  sections: Record<string, string>;
  completeness: Record<string, Record<string, string>>;
  long_sentences: {
    sentence: string;
    word_count: string;
    suggestion: string;
  }[];
  vocab_suggestions: {
    weak: string;
    better: string;
    location: string;
  }[];
  sentiment: {
    polarity: number;
    label: string;
  };
  score_trends: {
    metric: string;
    value: number;
  }[];
  keyword_frequency: {
    keyword: string;
    count: number;
  }[];
  research_gaps: string[];
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "charts", label: "Charts" },
  { id: "research-gaps", label: "Research Gaps" },
  { id: "history", label: "History" },
  { id: "sections", label: "Sections" },
  { id: "completeness", label: "Checklist" },
  { id: "long-sentences", label: "Long Sentences" },
  { id: "vocab", label: "Vocabulary" },
  { id: "preview", label: "Preview" },
];

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [scores, setScores] = useState<StoredPaper["scores"] | null>(null);
  const [stats, setStats] = useState<StoredPaper["stats"] | null>(null);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [completeness, setCompleteness] = useState<StoredPaper["completeness"]>({});
  const [longSentences, setLongSentences] = useState<StoredPaper["long_sentences"]>([]);
  const [vocabSuggestions, setVocabSuggestions] = useState<StoredPaper["vocab_suggestions"]>([]);
  const [sentiment, setSentiment] = useState<StoredPaper["sentiment"] | null>(null);
  const [scoreTrends, setScoreTrends] = useState<StoredPaper["score_trends"]>([]);
  const [keywordFrequency, setKeywordFrequency] = useState<StoredPaper["keyword_frequency"]>([]);
  const [researchGaps, setResearchGaps] = useState<string[]>([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [hasPaper, setHasPaper] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);

  useEffect(() => {
    const storedPaper = localStorage.getItem("uploadedPaper");
    if (storedPaper) {
      try {
        const parsed: StoredPaper = JSON.parse(storedPaper);
        setPreview(parsed.preview || "");
        setTitle(parsed.title || "");
        setSummary(parsed.summary || "");
        setKeywords(parsed.keywords || []);
        setScores(parsed.scores || null);
        setStats(parsed.stats || null);
        setSections(parsed.sections || {});
        setCompleteness(parsed.completeness || {});
        setLongSentences(parsed.long_sentences || []);
        setVocabSuggestions(parsed.vocab_suggestions || []);
        setSentiment(parsed.sentiment || null);
        setScoreTrends(parsed.score_trends || []);
        setKeywordFrequency(parsed.keyword_frequency || []);
        setResearchGaps(parsed.research_gaps || []);
        setHasPaper(true);
      } catch {
        localStorage.removeItem("uploadedPaper");
      }
    }

    fetchHistory();
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(item.id);
          }
        },
        {
          rootMargin: "-25% 0px -55% 0px",
          threshold: 0.1,
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [
    hasPaper,
    preview,
    summary,
    answer,
    sections,
    completeness,
    longSentences,
    vocabSuggestions,
    researchGaps,
    chatHistory,
  ]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history");
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatHistory(data);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a PDF file.");
      return;
    }

    setLoading(true);
    setMessage("");
    setPreview("");
    setAnswer("");
    setCitations([]);
    setTitle("");
    setSummary("");
    setKeywords([]);
    setScores(null);
    setStats(null);
    setSections({});
    setCompleteness({});
    setLongSentences([]);
    setVocabSuggestions([]);
    setSentiment(null);
    setScoreTrends([]);
    setKeywordFrequency([]);
    setResearchGaps([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResponse = await res.json();

      if (!res.ok) {
        setMessage(data.detail || data.message || "Upload failed.");
        setHasPaper(false);
        return;
      }

      const safeData: StoredPaper = {
        filename: data.filename || file.name,
        preview: data.preview || "",
        uploadedAt: new Date().toISOString(),
        title: data.title || "",
        summary: data.summary || "",
        keywords: data.keywords || [],
        scores: data.scores || {
          Language: 0,
          Coherence: 0,
          Reasoning: 0,
          Sophistication: 0,
          Readability: 0,
          Composite: 0,
        },
        stats: data.stats || {
          word_count: 0,
          sentence_count: 0,
          avg_sentence_len: 0,
          avg_word_len: 0,
          vocab_diversity: 0,
          complex_word_ratio: 0,
        },
        sections: data.sections || {},
        completeness: data.completeness || {},
        long_sentences: data.long_sentences || [],
        vocab_suggestions: data.vocab_suggestions || [],
        sentiment: data.sentiment || { polarity: 0, label: "Neutral" },
        score_trends: data.score_trends || [],
        keyword_frequency: data.keyword_frequency || [],
        research_gaps: data.research_gaps || [],
      };

      setMessage(data.message || "File uploaded successfully.");
      setPreview(safeData.preview);
      setTitle(safeData.title);
      setSummary(safeData.summary);
      setKeywords(safeData.keywords);
      setScores(safeData.scores);
      setStats(safeData.stats);
      setSections(safeData.sections);
      setCompleteness(safeData.completeness);
      setLongSentences(safeData.long_sentences);
      setVocabSuggestions(safeData.vocab_suggestions);
      setSentiment(safeData.sentiment);
      setScoreTrends(safeData.score_trends);
      setKeywordFrequency(safeData.keyword_frequency);
      setResearchGaps(safeData.research_gaps);
      setHasPaper(true);

      localStorage.setItem("uploadedPaper", JSON.stringify(safeData));
    } catch {
      setMessage("Could not connect to backend. Make sure FastAPI is running on port 8000.");
      setHasPaper(false);
    } finally {
      setLoading(false);
    }
  };

  const askAI = async (customQuestion?: string) => {
    const finalQuestion = (customQuestion || question).trim();

    if (!hasPaper) {
      setAnswer("Please upload a paper first.");
      setCitations([]);
      return;
    }

    if (!finalQuestion) {
      setAnswer("Please enter a question.");
      setCitations([]);
      return;
    }

    setAsking(true);
    setAnswer("");
    setCitations([]);

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: finalQuestion }),
      });

      const data: AskResponse = await res.json();

      if (!res.ok) {
        setAnswer(data.detail || "AI request failed.");
        setCitations([]);
        return;
      }

      setAnswer(data.answer || "No answer returned.");
      setCitations(data.citations || []);
      setQuestion("");
      fetchHistory();
    } catch {
      setAnswer("Could not connect to backend. Restart FastAPI and try again.");
      setCitations([]);
    } finally {
      setAsking(false);
    }
  };

  const copyAnswer = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setMessage("Answer copied.");
      setTimeout(() => setMessage(""), 1500);
    } catch {
      setMessage("Could not copy answer.");
    }
  };

  const downloadReport = async () => {
    if (!hasPaper) {
      setMessage("Upload a paper first.");
      return;
    }

    setDownloadingReport(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/report");
      if (!res.ok) {
        setMessage("Could not generate PDF report.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PaperIQ_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Report downloaded.");
      setTimeout(() => setMessage(""), 1500);
    } catch {
      setMessage("Could not download report.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const scoreCard = (label: string, value: number | undefined, helper?: string) => (
    <div className="feature-card" style={{ padding: 22 }}>
      <p className="stat-label">{label}</p>
      <div className="stat-value" style={{ fontSize: 28 }}>{value ?? 0}</div>
      {helper ? <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>{helper}</p> : null}
    </div>
  );

  const statCard = (label: string, value: string | number | undefined) => (
    <div className="feature-card" style={{ padding: 22 }}>
      <p className="stat-label">{label}</p>
      <div className="stat-value" style={{ fontSize: 22 }}>{value ?? 0}</div>
    </div>
  );

  const statusPill = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      Present: { bg: "#dcfce7", color: "#166534" },
      Weak: { bg: "#fef3c7", color: "#92400e" },
      Missing: { bg: "#fee2e2", color: "#991b1b" },
    };

    const style = colors[status] || { bg: "#e5e7eb", color: "#111827" };

    return (
      <span
        style={{
          padding: "6px 12px",
          borderRadius: "999px",
          fontSize: 12,
          fontWeight: 700,
          background: style.bg,
          color: style.color,
        }}
      >
        {status}
      </span>
    );
  };

  const sentimentColor = (label?: string) => {
    if (label === "Positive") return "#166534";
    if (label === "Negative") return "#991b1b";
    return "#374151";
  };

  const sentimentBg = (label?: string) => {
    if (label === "Positive") return "#dcfce7";
    if (label === "Negative") return "#fee2e2";
    return "#e5e7eb";
  };

  const chartData = scoreTrends.map((item) => ({
    name: item.metric,
    value: item.value,
  }));

  const keywordChartData = keywordFrequency.map((item) => ({
    name: item.keyword,
    count: item.count,
  }));

  return (
    <ThemeProvider>
      <main className="app-shell">
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          @keyframes pulse {
            0% {
              opacity: 0.9;
            }
            50% {
              opacity: 0.55;
            }
            100% {
              opacity: 0.9;
            }
          }
        `}</style>

        <div className="app-container">
          <FloatingNav showDashboardLinks onLogout={handleLogout} />

          <div className="top-bar" style={{ marginTop: 10 }}>
            <div>
              <div className="brand-badge">AI Workspace</div>
              <h1 className="hero-title" style={{ fontSize: 50 }}>
                Upload, analyze, visualize, and export
              </h1>
              <p className="hero-subtitle" style={{ maxWidth: 760 }}>
                Premium workspace with section navigation for easier scrolling.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px minmax(0, 1fr)",
              gap: 24,
              alignItems: "start",
              marginTop: 26,
            }}
          >
            <aside
              style={{
                position: "sticky",
                top: 110,
                alignSelf: "start",
              }}
            >
              <div
                className="glass-card"
                style={{
                  padding: 18,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--muted)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  Quick Navigation
                </div>

                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="secondary-btn"
                    style={{
                      justifyContent: "flex-start",
                      padding: "12px 14px",
                      borderRadius: 14,
                      background:
                        activeSection === item.id
                          ? "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(147,197,253,0.18))"
                          : "rgba(255,255,255,0.58)",
                      border:
                        activeSection === item.id
                          ? "1px solid rgba(139,92,246,0.28)"
                          : "1px solid var(--border)",
                      fontWeight: activeSection === item.id ? 800 : 700,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>

            <div style={{ minWidth: 0 }}>
              <div className="glass-card" style={{ padding: 30 }} id="overview">
                <h2 className="section-title">Upload PDF</h2>
                <p className="section-subtitle" style={{ marginTop: 10 }}>
                  Choose a PDF and run the full document analysis.
                </p>

                <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="input-area"
                  />

                  <div className="flex-row">
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="primary-btn"
                      style={{ opacity: loading ? 0.7 : 1 }}
                    >
                      {loading ? "Uploading..." : "Upload and Analyze"}
                    </button>

                    <button
                      onClick={downloadReport}
                      disabled={downloadingReport || !hasPaper}
                      className="secondary-btn"
                      style={{ opacity: downloadingReport || !hasPaper ? 0.7 : 1 }}
                    >
                      {downloadingReport ? "Preparing PDF..." : "Download PDF Report"}
                    </button>
                  </div>

                  {message && (
                    <p style={{ color: "var(--primary-strong)", fontWeight: 600, margin: 0 }}>
                      {message}
                    </p>
                  )}
                </div>
              </div>

              <div className="glass-card" style={{ padding: 30, marginTop: 24 }}>
                <h2 className="section-title">Ask AI</h2>
                <p className="section-subtitle" style={{ marginTop: 10 }}>
                  Ask focused questions and get cleaner answers from the uploaded paper.
                </p>

                <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
                  <textarea
                    placeholder="Ask something like: What is the main contribution? What does the methodology do?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="input-area"
                    style={{ minHeight: 140 }}
                  />

                  <div className="flex-row">
                    <button className="primary-btn" onClick={() => askAI()}>
                      {asking ? "Thinking..." : "Ask AI"}
                    </button>

                    <button className="secondary-btn" onClick={() => askAI("Give me a short summary")}>
                      Short Summary
                    </button>

                    <button className="secondary-btn" onClick={() => askAI("What is the main contribution?")}>
                      Main Contribution
                    </button>

                    <button className="secondary-btn" onClick={() => askAI("Explain the methodology simply")}>
                      Methodology
                    </button>

                    <button className="secondary-btn" onClick={() => askAI("What are the limitations?")}>
                      Limitations
                    </button>

                    <button className="secondary-btn" onClick={() => askAI("What is the conclusion?")}>
                      Conclusion
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <>
                  <div className="grid-3" style={{ marginTop: 28 }}>
                    <LoadingCard lines={2} minHeight={110} />
                    <LoadingCard lines={2} minHeight={110} />
                    <LoadingCard lines={2} minHeight={110} />
                  </div>

                  <div className="grid-2" style={{ marginTop: 28 }}>
                    <LoadingCard lines={6} minHeight={280} />
                    <LoadingCard lines={6} minHeight={280} />
                  </div>

                  <div style={{ marginTop: 28 }}>
                    <LoadingCard lines={8} minHeight={240} />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid-2" style={{ marginTop: 28, alignItems: "start" }}>
                    <div className="feature-card" style={{ padding: 26 }}>
                      <p className="stat-label">Detected title</p>
                      <h3 style={{ marginTop: 14, fontSize: 30, overflowWrap: "anywhere" }}>
                        {title || "Upload a PDF to detect title"}
                      </h3>
                    </div>

                    <div className="feature-card" style={{ padding: 26 }}>
                      <p className="stat-label">Keywords</p>
                      <div className="flex-row" style={{ marginTop: 14 }}>
                        {keywords.length > 0 ? (
                          keywords.map((keyword, index) => (
                            <span key={index} className="tag-chip">
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <p className="section-subtitle" style={{ margin: 0 }}>
                            No keywords yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid-3" style={{ marginTop: 28 }}>
                    {scoreCard("Composite", scores?.Composite, "Overall quality blend")}
                    {scoreCard("Language", scores?.Language, "Sentence + word quality")}
                    {scoreCard("Coherence", scores?.Coherence, "Flow and transitions")}
                    {scoreCard("Reasoning", scores?.Reasoning, "Evidence and logic")}
                    {scoreCard("Sophistication", scores?.Sophistication, "Vocabulary depth")}
                    {scoreCard("Readability", scores?.Readability, "Ease of reading")}
                  </div>

                  <div className="grid-3" style={{ marginTop: 28 }}>
                    {statCard("Words", stats?.word_count)}
                    {statCard("Sentences", stats?.sentence_count)}
                    {statCard("Avg Sentence Length", stats?.avg_sentence_len)}
                    {statCard("Avg Word Length", stats?.avg_word_len)}
                    {statCard("Vocab Diversity", stats?.vocab_diversity)}
                    {statCard("Complex Word Ratio", stats?.complex_word_ratio)}
                  </div>

                  <div className="grid-2" style={{ marginTop: 28, alignItems: "start" }} id="charts">
                    <div className="glass-card" style={{ padding: 30 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <h2 className="section-title">Auto Summary</h2>
                        {sentiment && (
                          <span
                            style={{
                              padding: "8px 14px",
                              borderRadius: 999,
                              background: sentimentBg(sentiment.label),
                              color: sentimentColor(sentiment.label),
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            Sentiment: {sentiment.label}
                          </span>
                        )}
                      </div>
                      <div className="preview-box" style={{ marginTop: 18, minHeight: 220 }}>
                        {summary || "Your extracted summary will appear here."}
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: 30 }}>
                      <h2 className="section-title">Score Radar</h2>
                      <div style={{ width: "100%", height: 320, marginTop: 20 }}>
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={chartData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="name" />
                              <Radar
                                name="Score"
                                dataKey="value"
                                stroke="#8b5cf6"
                                fill="#8b5cf6"
                                fillOpacity={0.35}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="preview-box">Upload a paper to see score chart.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }}>
                    <h2 className="section-title">Keyword Frequency</h2>
                    <div style={{ width: "100%", height: 320, marginTop: 20 }}>
                      {keywordChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={keywordChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="preview-box">Upload a paper to see keyword chart.</div>
                      )}
                    </div>
                  </div>

                  <div id="research-gaps" className="glass-card" style={{ padding: 30, marginTop: 28 }}>
                    <h2 className="section-title">Research Gap Detection</h2>
                    <p className="section-subtitle" style={{ marginTop: 10 }}>
                      AI-generated signals showing what may be missing or underexplored in the paper.
                    </p>

                    <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
                      {researchGaps.length > 0 ? (
                        researchGaps.map((gap, index) => (
                          <div
                            key={index}
                            className="feature-card"
                            style={{
                              padding: 18,
                              borderLeft: "6px solid #a78bfa",
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Gap {index + 1}</div>
                            <p style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.8 }}>
                              {gap}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="section-subtitle" style={{ margin: 0 }}>
                          Upload a paper to detect possible research gaps.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }} id="history">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                      <h2 className="section-title">Latest AI Answer</h2>
                      {answer && (
                        <button className="secondary-btn" onClick={copyAnswer}>
                          Copy Answer
                        </button>
                      )}
                    </div>

                    <div className="feature-card" style={{ marginTop: 18, padding: 22 }}>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>AI Response</div>
                      <div
                        style={{
                          marginTop: 14,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.9,
                          color: "var(--text)",
                        }}
                      >
                        {answer || "Ask a question to see the answer here."}
                      </div>
                    </div>

                    <div className="glass-card" style={{ marginTop: 18, padding: 22 }}>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>Citations</div>
                      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {citations.length > 0 ? (
                          citations.map((citation, index) => (
                            <span
                              key={`${citation}-${index}`}
                              className="tag-chip"
                              style={{
                                background: "rgba(167,139,250,0.12)",
                                border: "1px solid rgba(167,139,250,0.25)",
                              }}
                            >
                              {citation}
                            </span>
                          ))
                        ) : (
                          <p className="section-subtitle" style={{ margin: 0 }}>
                            No citations yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <h3 style={{ marginTop: 26, fontSize: 24 }}>Chat History</h3>
                    <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                      {chatHistory.length > 0 ? (
                        chatHistory.map((item, index) => (
                          <div key={item.id || index} className="feature-card" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 17 }}>Q: {item.question}</div>
                            <p
                              style={{
                                marginTop: 10,
                                color: "var(--muted)",
                                lineHeight: 1.8,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {item.answer}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="section-subtitle" style={{ margin: 0 }}>
                          No chat history yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }} id="sections">
                    <h2 className="section-title">Section Summaries</h2>
                    <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                      {Object.keys(sections).length > 0 ? (
                        Object.entries(sections).map(([sectionName, sectionSummary]) => (
                          <div key={sectionName} className="feature-card" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 18 }}>{sectionName}</div>
                            <p style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.8 }}>
                              {sectionSummary}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="section-subtitle" style={{ margin: 0 }}>
                          No sections yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }} id="completeness">
                    <h2 className="section-title">Section Completeness Checklist</h2>
                    <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                      {Object.keys(completeness).length > 0 ? (
                        Object.entries(completeness).map(([sectionName, criteria]) => (
                          <div key={sectionName} className="feature-card" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 18 }}>{sectionName}</div>
                            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                              {Object.entries(criteria).map(([criterion, status]) => (
                                <div
                                  key={criterion}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 16,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ color: "var(--muted)" }}>{criterion}</div>
                                  {statusPill(status)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="section-subtitle" style={{ margin: 0 }}>
                          Upload a paper to view completeness analysis.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }} id="long-sentences">
                    <h2 className="section-title">Long Sentence Issues</h2>
                    <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                      {longSentences.length > 0 ? (
                        longSentences.map((item, index) => (
                          <div key={index} className="feature-card" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800 }}>Sentence ({item.word_count} words)</div>
                            <p style={{ marginTop: 10, lineHeight: 1.8 }}>{item.sentence}</p>
                            <p style={{ marginTop: 10, color: "var(--muted)" }}>
                              Suggestion: {item.suggestion}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="section-subtitle" style={{ margin: 0 }}>
                          No long sentence issues found.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }} id="vocab">
                    <h2 className="section-title">Vocabulary Suggestions</h2>
                    <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                      {vocabSuggestions.length > 0 ? (
                        vocabSuggestions.map((item, index) => (
                          <div key={index} className="feature-card" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800 }}>
                              Replace "{item.weak}" → "{item.better}"
                            </div>
                            <p style={{ marginTop: 10, color: "var(--muted)" }}>
                              Location: {item.location}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="section-subtitle" style={{ margin: 0 }}>
                          No vocabulary suggestions found.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 30, marginTop: 28 }} id="preview">
                    <h2 className="section-title">Document Preview</h2>
                    <div className="preview-box" style={{ marginTop: 18, minHeight: 320 }}>
                      {preview || "Upload a paper to view extracted preview text."}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}