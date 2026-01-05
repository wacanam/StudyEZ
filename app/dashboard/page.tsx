"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FlashcardViewer from "@/app/components/FlashcardViewer";
import QuizViewer from "@/app/components/QuizViewer";
import ChatHistory from "@/app/components/ChatHistory";
import DocumentList from "@/app/components/DocumentList";

interface QueryResponse {
  answer: string;
  sources: Array<{
    text: string;
    score: number;
  }>;
  sessionId?: number;
}

interface UploadStatus {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  message: string;
  documentsCount?: number;
}

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  userId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface Quiz {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  userId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  sources: Array<{
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  createdAt: string;
}

interface ChatSession {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

type StudyMode = "query" | "flashcards" | "quiz" | "documents";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
    message: "",
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [studyMode, setStudyMode] = useState<StudyMode>("query");
  const [studyTopic, setStudyTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [generationStatus, setGenerationStatus] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Load existing flashcards and quizzes on component mount
  useEffect(() => {
    loadStudyTools();
  }, []);

  // Handle session selection from history
  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session);
    setChatMessages(session.messages);
    setCurrentSessionId(session.id);
    
    // Display the last response in the session
    const assistantMessages = session.messages.filter(m => m.role === "assistant");
    if (assistantMessages.length > 0) {
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      setResponse({
        answer: lastAssistant.content,
        sources: lastAssistant.sources,
        sessionId: session.id,
      });
    }
    
    addLog(`Loaded chat session: ${session.title || "Untitled"}`);
  };

  const handleHistoryUpdate = () => {
    // Reset current session when history is cleared
    setCurrentSessionId(null);
    setSelectedSession(null);
    setChatMessages([]);
    setResponse(null);
    addLog("Chat history cleared");
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setSelectedSession(null);
    setChatMessages([]);
    setResponse(null);
    setQuery("");
    addLog("Started new chat session");
  };

  const loadStudyTools = async () => {
    try {
      const res = await fetch("/api/generate-tools");
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards || []);
        setQuizzes(data.quizzes || []);
        addLog(`Loaded ${data.flashcards?.length || 0} flashcards and ${data.quizzes?.length || 0} quizzes`);
      }
    } catch (error) {
      console.error("Failed to load study tools:", error);
    }
  };

  const handleGenerateTools = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTopic.trim()) return;

    setIsGenerating(true);
    setGenerationStatus("Generating study tools...");
    addLog(`Generating tools for topic: "${studyTopic}"`);

    try {
      const res = await fetch("/api/generate-tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: studyTopic }),
      });

      const data = await res.json();

      if (res.ok) {
        setGenerationStatus("Successfully generated study tools!");
        addLog(`Generated ${data.flashcards?.length || 0} flashcards and ${data.quizzes?.length || 0} quiz questions`);
        // Reload the study tools
        await loadStudyTools();
        // Switch to the appropriate mode
        if (studyMode === "query") {
          setStudyMode("flashcards");
        }
      } else {
        setGenerationStatus(`Error: ${data.error}`);
        addLog(`Generation error: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setGenerationStatus(`Error: ${errorMessage}`);
      addLog(`Generation exception: ${errorMessage}`);
    }

    setIsGenerating(false);
    setTimeout(() => setGenerationStatus(""), 5000);
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
        body: JSON.stringify({ 
          query,
          sessionId: currentSessionId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data);
        setCurrentSessionId(data.sessionId);
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
    <div className="flex h-screen bg-background">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
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

        {/* Study Mode Selector */}
        <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold text-ink mb-4">
            🎯 Study Mode
          </h2>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setStudyMode("query")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                studyMode === "query"
                  ? "bg-accent text-white"
                  : "bg-background text-ink border border-ink/20 hover:border-accent/50"
              }`}
            >
              🔍 Q&A Mode
            </button>
            <button
              onClick={() => setStudyMode("flashcards")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                studyMode === "flashcards"
                  ? "bg-accent text-white"
                  : "bg-background text-ink border border-ink/20 hover:border-accent/50"
              }`}
            >
              🗂️ Flashcards
            </button>
            <button
              onClick={() => setStudyMode("quiz")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                studyMode === "quiz"
                  ? "bg-accent text-white"
                  : "bg-background text-ink border border-ink/20 hover:border-accent/50"
              }`}
            >
              📝 Quiz Mode
            </button>
            <button
              onClick={() => setStudyMode("documents")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                studyMode === "documents"
                  ? "bg-accent text-white"
                  : "bg-background text-ink border border-ink/20 hover:border-accent/50"
              }`}
            >
              📚 Documents
            </button>
          </div>

          {/* Generate Study Tools */}
          {(studyMode === "flashcards" || studyMode === "quiz") && (
            <div className="space-y-4">
              <form onSubmit={handleGenerateTools} className="flex gap-3">
                <input
                  type="text"
                  value={studyTopic}
                  onChange={(e) => setStudyTopic(e.target.value)}
                  placeholder="Enter a topic to generate study tools..."
                  className="flex-1 px-4 py-3 rounded-lg border border-ink/20 bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink placeholder:text-ink/40"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !studyTopic.trim()}
                  className="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              </form>

              {generationStatus && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    generationStatus.includes("Error")
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {generationStatus}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Query Section - shown when in Q&A mode */}
        {studyMode === "query" && (
          <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-ink">
                🔍 Ask a Question
              </h2>
              {currentSessionId && (
                <button
                  onClick={handleNewChat}
                  className="px-3 py-1 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                >
                  + New Chat
                </button>
              )}
            </div>
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
        )}

        {/* Flashcard Viewer - shown when in flashcard mode */}
        {studyMode === "flashcards" && (
          <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-semibold text-ink mb-6">
              🗂️ Flashcards
            </h2>
            <FlashcardViewer flashcards={flashcards} />
          </section>
        )}

        {/* Quiz Viewer - shown when in quiz mode */}
        {studyMode === "quiz" && (
          <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-semibold text-ink mb-6">
              📝 Quiz
            </h2>
            <QuizViewer quizzes={quizzes} />
          </section>
        )}

        {/* Document List - shown when in documents mode */}
        {studyMode === "documents" && (
          <section className="bg-surface rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-semibold text-ink mb-6">
              📚 Manage Documents
            </h2>
            <DocumentList onUpdate={() => addLog("Document list updated")} />
          </section>
        )}

        {/* Response Section */}
        {studyMode === "query" && response && (
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

      {/* Chat History Sidebar - only shown in query mode */}
      {studyMode === "query" && (
        <ChatHistory
          onSessionSelect={handleSessionSelect}
          onHistoryUpdate={handleHistoryUpdate}
          selectedSessionId={currentSessionId}
        />
      )}
    </div>
  );
}
