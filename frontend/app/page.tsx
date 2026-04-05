"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeProvider from "./components/ThemeProvider";
import FloatingNav from "./components/FloatingNav";

function useCountUp(end: number, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frame = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [end, duration]);

  return value;
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(24px)",
        transition: `all 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const papers = useCountUp(1200);
  const questions = useCountUp(4800);
  const score = useCountUp(92);

  return (
    <ThemeProvider>
      <main className="app-shell landing-shell">
        <style jsx global>{`
          @keyframes floatSlow {
            0% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(12px, -10px, 0) scale(1.03);
            }
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          @keyframes shimmerMove {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          @keyframes softPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.18);
            }
            70% {
              box-shadow: 0 0 0 18px rgba(139, 92, 246, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
            }
          }

          .landing-shell {
            position: relative;
            overflow: hidden;
          }

          .landing-bg {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }

          .landing-orb {
            position: absolute;
            border-radius: 999px;
            filter: blur(70px);
            opacity: 0.45;
            animation: floatSlow 9s ease-in-out infinite;
          }

          .landing-orb.one {
            width: 300px;
            height: 300px;
            top: 100px;
            left: -90px;
            background: rgba(196, 181, 253, 0.45);
          }

          .landing-orb.two {
            width: 260px;
            height: 260px;
            top: 220px;
            right: -80px;
            background: rgba(147, 197, 253, 0.4);
            animation-delay: 1s;
          }

          .landing-orb.three {
            width: 240px;
            height: 240px;
            bottom: 100px;
            left: 28%;
            background: rgba(251, 207, 232, 0.32);
            animation-delay: 2s;
          }

          .landing-grid {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
            background-size: 38px 38px;
            mask-image: radial-gradient(circle at center, black 45%, transparent 92%);
          }

          .landing-wrap {
            position: relative;
            z-index: 2;
          }

          .landing-hero {
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
            gap: 56px;
            align-items: center;
            padding-top: 48px;
          }

          .landing-left {
            max-width: 720px;
          }

          .landing-kicker {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.68);
            border: 1px solid var(--border);
            color: var(--text);
            font-size: 14px;
            font-weight: 700;
            backdrop-filter: blur(14px);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
          }

          .landing-title {
            margin: 18px 0 0 0;
            font-size: clamp(42px, 6vw, 80px);
            line-height: 0.95;
            letter-spacing: -0.05em;
            font-weight: 800;
            color: var(--text);
          }

          .landing-gradient-text {
            background: linear-gradient(135deg, #8b5cf6, #6366f1, #60a5fa);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .landing-subtitle {
            margin-top: 24px;
            font-size: 18px;
            line-height: 1.85;
            color: var(--muted);
            max-width: 680px;
          }

          .landing-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            margin-top: 30px;
          }

          .landing-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 190px;
            padding: 16px 24px;
            border-radius: 18px;
            text-decoration: none;
            color: white;
            font-weight: 700;
            background: linear-gradient(135deg, #a78bfa, #8b5cf6);
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
            transition: transform 0.2s ease;
          }

          .landing-primary:hover {
            transform: translateY(-2px);
          }

          .landing-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 190px;
            padding: 16px 24px;
            border-radius: 18px;
            text-decoration: none;
            color: var(--text);
            font-weight: 700;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.72);
            backdrop-filter: blur(14px);
            transition: transform 0.2s ease;
          }

          .landing-secondary:hover {
            transform: translateY(-2px);
          }

          .landing-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 26px;
          }

          .landing-pill {
            padding: 10px 14px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.66);
            color: var(--text);
            font-size: 13px;
            font-weight: 700;
          }

          .landing-right {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .mockup-shell {
            width: 100%;
            max-width: 560px;
            border-radius: 32px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.72);
            backdrop-filter: blur(18px);
            box-shadow: 0 30px 70px rgba(15, 23, 42, 0.08);
            padding: 22px;
          }

          .mockup-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }

          .mockup-dots {
            display: flex;
            gap: 8px;
          }

          .mockup-dots span {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            display: block;
          }

          .mockup-dots span:nth-child(1) {
            background: #fca5a5;
          }

          .mockup-dots span:nth-child(2) {
            background: #fde68a;
          }

          .mockup-dots span:nth-child(3) {
            background: #86efac;
          }

          .mockup-badge {
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            font-weight: 700;
            color: var(--text);
          }

          .mockup-main {
            border-radius: 24px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.82);
            padding: 22px;
          }

          .mockup-label {
            font-size: 13px;
            font-weight: 700;
            color: var(--muted);
          }

          .mockup-title {
            margin-top: 10px;
            font-size: 24px;
            line-height: 1.3;
            font-weight: 800;
            color: var(--text);
          }

          .mockup-text {
            margin-top: 14px;
            font-size: 15px;
            line-height: 1.8;
            color: var(--muted);
          }

          .mockup-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
          }

          .mockup-tags span {
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(167, 139, 250, 0.12);
            color: #6d28d9;
            font-size: 12px;
            font-weight: 700;
          }

          .mockup-grid {
            margin-top: 18px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .mockup-card {
            border-radius: 20px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.84);
            padding: 18px;
          }

          .mockup-card h4 {
            margin: 0;
            font-size: 13px;
            color: var(--muted);
            font-weight: 700;
          }

          .mockup-card .big {
            margin-top: 10px;
            font-size: 22px;
            font-weight: 800;
            color: var(--text);
          }

          .mockup-card .small {
            margin-top: 8px;
            font-size: 14px;
            color: var(--muted);
            line-height: 1.6;
          }

          .mockup-score {
            margin-top: 14px;
            display: grid;
            gap: 12px;
          }

          .mockup-row {
            display: grid;
            gap: 6px;
          }

          .mockup-row-top {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: 700;
            color: var(--text);
          }

          .mockup-track {
            height: 10px;
            border-radius: 999px;
            background: rgba(148, 163, 184, 0.14);
            overflow: hidden;
          }

          .mockup-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #c4b5fd, #a78bfa, #93c5fd);
          }

          .landing-stats {
            margin-top: 32px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .landing-stat-card {
            padding: 20px;
            border-radius: 22px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.7);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
          }

          .landing-stat-value {
            font-size: 34px;
            font-weight: 800;
            color: var(--text);
            line-height: 1;
          }

          .landing-stat-label {
            margin-top: 8px;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.6;
          }

          .landing-section {
            margin-top: 78px;
          }

          .section-kicker {
            display: inline-flex;
            padding: 8px 14px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.66);
            font-size: 13px;
            font-weight: 700;
            color: var(--text);
          }

          .section-title {
            margin-top: 16px;
            font-size: clamp(30px, 4vw, 52px);
            line-height: 1.05;
            letter-spacing: -0.04em;
            color: var(--text);
            font-weight: 800;
          }

          .section-subtitle {
            margin-top: 16px;
            max-width: 760px;
            color: var(--muted);
            font-size: 17px;
            line-height: 1.85;
          }

          .landing-features {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 22px;
          }

          .landing-feature-card {
            padding: 24px;
            border-radius: 24px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.7);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
            backdrop-filter: blur(14px);
          }

          .landing-feature-icon {
            width: 56px;
            height: 56px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            background: linear-gradient(135deg, rgba(196, 181, 253, 0.52), rgba(191, 219, 254, 0.52));
          }

          .landing-feature-title {
            margin-top: 16px;
            font-size: 22px;
            font-weight: 800;
            color: var(--text);
          }

          .landing-feature-text {
            margin-top: 10px;
            color: var(--muted);
            line-height: 1.8;
          }

          .usecase-grid {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 22px;
          }

          .usecase-card {
            position: relative;
            overflow: hidden;
            padding: 24px;
            border-radius: 24px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.72);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
          }

          .usecase-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(
              120deg,
              transparent 0%,
              rgba(255, 255, 255, 0.18) 40%,
              transparent 70%
            );
            background-size: 220% 100%;
            animation: shimmerMove 4.8s linear infinite;
            pointer-events: none;
          }

          .usecase-title {
            position: relative;
            z-index: 1;
            font-size: 22px;
            font-weight: 800;
            color: var(--text);
          }

          .usecase-text {
            position: relative;
            z-index: 1;
            margin-top: 10px;
            color: var(--muted);
            line-height: 1.8;
          }

          .testimonial-grid {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 22px;
          }

          .testimonial-card {
            padding: 24px;
            border-radius: 24px;
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.72);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
          }

          .testimonial-text {
            color: var(--text);
            line-height: 1.85;
            font-size: 16px;
          }

          .testimonial-meta {
            margin-top: 16px;
            color: var(--muted);
            font-size: 14px;
            font-weight: 700;
          }

          .bottom-cta {
            margin-top: 82px;
            padding: 34px;
            border-radius: 30px;
            border: 1px solid var(--border);
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.82),
              rgba(243, 244, 246, 0.72)
            );
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06);
            text-align: center;
          }

          .bottom-cta-title {
            font-size: clamp(30px, 4vw, 52px);
            line-height: 1.05;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: var(--text);
          }

          .bottom-cta-text {
            margin: 16px auto 0;
            max-width: 760px;
            color: var(--muted);
            font-size: 17px;
            line-height: 1.85;
          }

          .bottom-cta-actions {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 14px;
            margin-top: 26px;
          }

          .footer {
            margin-top: 46px;
            padding: 22px 0 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            color: var(--muted);
            font-size: 14px;
          }

          .footer-brand {
            color: var(--text);
            font-weight: 800;
          }

          .footer-links {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
          }

          .footer-links a {
            color: var(--muted);
            text-decoration: none;
          }

          .footer-links a:hover {
            color: var(--text);
          }

          .pulse-badge {
            animation: softPulse 2.8s infinite;
          }

          @media (max-width: 1180px) {
            .landing-hero {
              grid-template-columns: 1fr;
              gap: 34px;
            }

            .landing-left {
              max-width: 100%;
            }

            .landing-right {
              justify-content: flex-start;
            }

            .mockup-shell {
              max-width: 100%;
            }

            .landing-features,
            .usecase-grid,
            .testimonial-grid {
              grid-template-columns: 1fr;
            }

            .landing-stats {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 760px) {
            .landing-title {
              font-size: 50px;
            }

            .landing-actions,
            .bottom-cta-actions {
              flex-direction: column;
              align-items: stretch;
            }

            .landing-primary,
            .landing-secondary {
              width: 100%;
            }

            .mockup-grid {
              grid-template-columns: 1fr;
            }

            .footer {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}</style>

        <div className="landing-bg">
          <div className="landing-orb one" />
          <div className="landing-orb two" />
          <div className="landing-orb three" />
          <div className="landing-grid" />
        </div>

        <div className="app-container landing-wrap">
          <FloatingNav showAuthLinks />

          <section className="landing-hero">
            <Reveal>
              <div className="landing-left">
                <div className="landing-kicker pulse-badge">
                  <span>✦</span>
                  <span>AI-powered research analysis workspace</span>
                </div>

                <h1 className="landing-title">
                  Turn research
                  <br />
                  papers into
                  <br />
                  <span className="landing-gradient-text">clear insights, scores, and answers.</span>
                </h1>

                <p className="landing-subtitle">
                  PaperIQ helps students and researchers upload PDFs, extract structure,
                  summarize content, analyze writing quality, compare papers, and chat with
                  their documents in one elegant workspace.
                </p>

                <div className="landing-actions">
                  <Link href="/signup" className="landing-primary">
                    Get Started Free →
                  </Link>
                  <Link href="/login" className="landing-secondary">
                    Open Workspace
                  </Link>
                </div>

                <div className="landing-pills">
                  <div className="landing-pill">PDF Upload + Extraction</div>
                  <div className="landing-pill">AI Q&A</div>
                  <div className="landing-pill">Quality Scores</div>
                  <div className="landing-pill">Multi-Paper Compare</div>
                </div>

                <div className="landing-stats">
                  <div className="landing-stat-card">
                    <div className="landing-stat-value">{papers}+</div>
                    <div className="landing-stat-label">papers processed in student-style workflows</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value">{questions}+</div>
                    <div className="landing-stat-label">AI questions answered from uploaded PDFs</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value">{score}%</div>
                    <div className="landing-stat-label">clarity boost with structured analysis views</div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="landing-right">
                <div className="mockup-shell">
                  <div className="mockup-top">
                    <div className="mockup-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="mockup-badge">PaperIQ Workspace</div>
                  </div>

                  <div className="mockup-main">
                    <div className="mockup-label">Ask your paper</div>
                    <div className="mockup-title">Summaries, methodology, keywords</div>
                    <div className="mockup-text">
                      Upload once, then chat naturally with the document. Pull out
                      conclusions, limitations, contributions, and section summaries instantly.
                    </div>

                    <div className="mockup-tags">
                      <span>Summary</span>
                      <span>Methods</span>
                      <span>Keywords</span>
                      <span>Conclusion</span>
                    </div>

                    <div className="mockup-grid">
                      <div className="mockup-card">
                        <h4>Composite</h4>
                        <div className="big">88</div>
                        <div className="small">Academic quality index</div>
                      </div>

                      <div className="mockup-card">
                        <h4>Sentiment</h4>
                        <div className="big">Neutral</div>
                        <div className="small">Balanced paper tone</div>
                      </div>

                      <div
                        className="mockup-card"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <h4>Score preview</h4>

                        <div className="mockup-score">
                          <div className="mockup-row">
                            <div className="mockup-row-top">
                              <span>Language</span>
                              <span>84</span>
                            </div>
                            <div className="mockup-track">
                              <div className="mockup-fill" style={{ width: "84%" }} />
                            </div>
                          </div>

                          <div className="mockup-row">
                            <div className="mockup-row-top">
                              <span>Coherence</span>
                              <span>79</span>
                            </div>
                            <div className="mockup-track">
                              <div className="mockup-fill" style={{ width: "79%" }} />
                            </div>
                          </div>

                          <div className="mockup-row">
                            <div className="mockup-row-top">
                              <span>Readability</span>
                              <span>86</span>
                            </div>
                            <div className="mockup-track">
                              <div className="mockup-fill" style={{ width: "86%" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          <section className="landing-section">
            <Reveal>
              <>
                <div className="section-kicker">Core features</div>
                <h2 className="section-title">Everything your paper needs, in one calm interface.</h2>
                <p className="section-subtitle">
                  From extraction to AI question answering to visual analysis, PaperIQ turns a raw PDF
                  into something structured, useful, and actually easy to work with.
                </p>
              </>
            </Reveal>

            <div className="landing-features">
              <Reveal delay={0.02}>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">📄</div>
                  <div className="landing-feature-title">Upload and extract</div>
                  <div className="landing-feature-text">
                    Parse research PDFs, pull previews, detect titles, extract sections, and get instant summaries.
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">🤖</div>
                  <div className="landing-feature-title">Ask AI naturally</div>
                  <div className="landing-feature-text">
                    Ask questions like a human and get focused answers grounded in the uploaded document.
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.14}>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">📊</div>
                  <div className="landing-feature-title">Analyze quality</div>
                  <div className="landing-feature-text">
                    Review readability, reasoning, coherence, vocabulary issues, and visual score insights in one place.
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="landing-section">
            <Reveal>
              <>
                <div className="section-kicker">Built for real use</div>
                <h2 className="section-title">Made for students, mentors, and project teams.</h2>
                <p className="section-subtitle">
                  Whether you are preparing for review, understanding a paper faster, or comparing multiple documents,
                  PaperIQ gives you structure without making the workflow feel heavy.
                </p>
              </>
            </Reveal>

            <div className="usecase-grid">
              <Reveal delay={0.02}>
                <div className="usecase-card">
                  <div className="usecase-title">For students</div>
                  <div className="usecase-text">
                    Turn dense papers into easier summaries, keywords, and quick revision notes before exams or presentations.
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="usecase-card">
                  <div className="usecase-title">For research reviews</div>
                  <div className="usecase-text">
                    Compare multiple papers, detect shared topics, and spot unique contributions faster during literature survey work.
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.14}>
                <div className="usecase-card">
                  <div className="usecase-title">For project mentors</div>
                  <div className="usecase-text">
                    Evaluate structure, readability, and completeness to guide students with more useful feedback.
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="landing-section">
            <Reveal>
              <>
                <div className="section-kicker">What it feels like</div>
                <h2 className="section-title">A calmer workflow, not just another tool.</h2>
              </>
            </Reveal>

            <div className="testimonial-grid">
              <Reveal delay={0.02}>
                <div className="testimonial-card">
                  <div className="testimonial-text">
                    “I could finally understand the methodology section without rereading the full paper three times.”
                  </div>
                  <div className="testimonial-meta">Student use-case · faster comprehension</div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="testimonial-card">
                  <div className="testimonial-text">
                    “The comparison view makes literature review work feel much less chaotic.”
                  </div>
                  <div className="testimonial-meta">Research workflow · clearer comparisons</div>
                </div>
              </Reveal>

              <Reveal delay={0.14}>
                <div className="testimonial-card">
                  <div className="testimonial-text">
                    “The quality checks and section completeness are actually useful for polishing reports.”
                  </div>
                  <div className="testimonial-meta">Project documentation · better final output</div>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="bottom-cta">
            <Reveal>
              <>
                <div className="section-kicker">Start now</div>
                <div className="bottom-cta-title">
                  Make research papers feel
                  <span className="landing-gradient-text"> simpler, cleaner, and smarter.</span>
                </div>
                <div className="bottom-cta-text">
                  Upload your first document, ask questions naturally, review quality signals,
                  and export useful analysis from one beautiful workspace.
                </div>

                <div className="bottom-cta-actions">
                  <Link href="/signup" className="landing-primary">
                    Create your account
                  </Link>
                  <Link href="/login" className="landing-secondary">
                    Open existing workspace
                  </Link>
                </div>
              </>
            </Reveal>
          </section>

          <footer className="footer">
            <div>
              <span className="footer-brand">PaperIQ</span> · Research analysis workspace
            </div>

            <div className="footer-links">
              <Link href="/signup">Signup</Link>
              <Link href="/login">Login</Link>
              <Link href="/upload">Workspace</Link>
              <Link href="/compare">Compare</Link>
            </div>
          </footer>
        </div>
      </main>
    </ThemeProvider>
  );
}