"use client";

import { useState } from "react";
import Link from "next/link";

interface QueryResponse {
  answer: string;
  sources: Array<{
    text: string;
    score: number;
  }>;
}

interface UploadStatus {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  message: string;
  documentsCount?: number;
}

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
    message: "",
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus({ status: "uploading", message: "Uploading files..." });
    addLog(`Starting upload of ${files.length} file(s)`);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      addLog(`Added file: ${files[i].name}`);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus({
          status: "success",
          message: data.message,
          documentsCount: data.documentsCount,
        });
        addLog(`Upload successful: ${data.documentsCount} chunks created`);
      } else {
        setUploadStatus({
          status: "error",
          message: data.error || "Upload failed",
        });
        addLog(`Upload error: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setUploadStatus({
        status: "error",
        message: errorMessage,
      });
      addLog(`Upload exception: ${errorMessage}`);
    }

    // Reset file input
    e.target.value = "";
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsQuerying(true);
    setResponse(null);
    addLog(`Querying: "${query}"`);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data);
        addLog(`Query successful: ${data.sources?.length || 0} sources found`);
      } else {
        addLog(`Query error: ${data.error}`);
        setResponse({
          answer: `Error: ${data.error}`,
          sources: [],
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addLog(`Query exception: ${errorMessage}`);
      setResponse({
        answer: `Error: ${errorMessage}`,
        sources: [],
      });
    }

    setIsQuerying(false);
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logo */}
        <header className="text-center mb-12">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="StudyEZ Logo"
              width={180}
              height={180}
              className="object-contain mx-auto mb-4"
            />
          </Link>
          <p className="text-ink/70 text-lg">
            AI-Powered RAG Platform for Effective Study Skills
          </p>
        </header>

        {/* Upload Section */}
        <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold text-ink mb-4">
            📚 Upload Study Materials
          </h2>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-accent/50 rounded-lg cursor-pointer hover:bg-accent/5 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-2 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-ink/70">
                  <span className="font-semibold text-accent">Click to upload</span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-ink/50">PDF or TXT files</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt"
                multiple
                onChange={handleFileUpload}
              />
            </label>

            {uploadStatus.status !== "idle" && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  uploadStatus.status === "success"
                    ? "bg-green-100 text-green-800"
                    : uploadStatus.status === "error"
                    ? "bg-red-100 text-red-800"
                    : "bg-accent/10 text-accent"
                }`}
              >
                {uploadStatus.status === "uploading" && "⏳ "}
                {uploadStatus.status === "processing" && "⚙️ "}
                {uploadStatus.status === "success" && "✅ "}
                {uploadStatus.status === "error" && "❌ "}
                {uploadStatus.message}
                {uploadStatus.documentsCount && (
                  <span className="ml-2">
                    ({uploadStatus.documentsCount} chunks indexed)
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Query Section */}
        <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold text-ink mb-4">
            🔍 Ask a Question
          </h2>
          <form onSubmit={handleQuery} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your study question..."
              className="flex-1 px-4 py-3 rounded-lg border border-ink/20 bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink placeholder:text-ink/40"
            />
            <button
              type="submit"
              disabled={isQuerying || !query.trim()}
              className="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isQuerying ? "Querying..." : "Ask"}
            </button>
          </form>
        </section>

        {/* Response Section */}
        {response && (
          <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-semibold text-ink mb-4">💡 Answer</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-ink whitespace-pre-wrap">{response.answer}</p>
            </div>

            {response.sources && response.sources.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-ink mb-3">
                  📄 Referenced Sources
                </h3>
                <div className="space-y-3">
                  {response.sources.map((source, index) => (
                    <div
                      key={index}
                      className="p-3 bg-background rounded-lg border border-ink/10"
                    >
                      <p className="text-sm text-ink/80">{source.text}</p>
                      <p className="text-xs text-ink/50 mt-1">
                        Relevance: {(source.score * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Log Panel */}
        <section className="bg-surface rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-ink mb-4">
            📋 Activity Log
          </h2>
          <div className="bg-ink/5 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-ink/40">No activity yet...</p>
            ) : (
              logs.map((log, index) => (
                <p key={index} className="text-ink/70 mb-1">
                  {log}
                </p>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center mt-8 text-sm text-ink/50">
          <p>
            Powered by LlamaIndex + PGVector + Gemini 2.5 Flash
          </p>
        </footer>
      </div>
    </main>
  );
}
