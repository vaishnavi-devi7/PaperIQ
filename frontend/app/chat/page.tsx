"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPaper, setHasPaper] = useState(false);

  useEffect(() => {
    const storedPaper = localStorage.getItem("uploadedPaper");
    setHasPaper(!!storedPaper);
  }, []);

  const askAI = async (customQuestion?: string) => {
    const finalQuestion = customQuestion || question;

    if (!hasPaper) {
      setAnswer("Please upload a paper first.");
      return;
    }

    if (!finalQuestion.trim()) {
      setAnswer("Please enter a question.");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: finalQuestion })
      });

      const data = await res.json();

      if (res.ok) {
        setAnswer(data.answer || "No response from AI");
      } else {
        setAnswer(data.detail || "Something went wrong");
      }
    } catch (error) {
      setAnswer("Could not connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-purple-400 font-medium">PaperIQ AI Chat</p>
            <h1 className="text-5xl font-bold mt-2">Ask Your Paper 🤖</h1>
            <p className="text-zinc-400 mt-2">
              Ask questions about the uploaded PDF.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl bg-zinc-700 px-6 py-3 font-semibold hover:bg-zinc-600"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950 p-8">
          <div className="space-y-4">
            {!hasPaper && (
              <p className="text-yellow-400">
                No uploaded paper found in this session. Upload a PDF first.
              </p>
            )}

            <textarea
              placeholder="Ask something like: summary, keywords, title, email, skills"
              className="w-full rounded-xl bg-slate-800 px-5 py-4 text-white outline-none min-h-[150px]"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => askAI()}
                className="rounded-xl bg-purple-600 px-6 py-3 font-semibold hover:bg-purple-700"
              >
                {loading ? "Thinking..." : "Ask AI"}
              </button>

              <button
                onClick={() => askAI("summary")}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
              >
                Summary
              </button>

              <button
                onClick={() => askAI("keywords")}
                className="rounded-xl bg-green-600 px-5 py-3 font-semibold hover:bg-green-700"
              >
                Keywords
              </button>

              <button
                onClick={() => askAI("title")}
                className="rounded-xl bg-orange-600 px-5 py-3 font-semibold hover:bg-orange-700"
              >
                Title
              </button>

              <button
                onClick={() => askAI("email")}
                className="rounded-xl bg-pink-600 px-5 py-3 font-semibold hover:bg-pink-700"
              >
                Email
              </button>

              <button
                onClick={() => askAI("skills")}
                className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold hover:bg-cyan-700"
              >
                Skills
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950 p-8">
          <h2 className="text-3xl font-bold mb-4">Answer</h2>
          <div className="rounded-xl bg-black p-6 min-h-[220px] whitespace-pre-wrap text-zinc-200 leading-8">
            {loading ? "Thinking..." : answer || "Your answer will appear here."}
          </div>
        </div>
      </div>
    </main>
  );
}