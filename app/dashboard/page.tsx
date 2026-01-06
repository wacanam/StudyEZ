"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import FlashcardViewer from "@/app/components/FlashcardViewer";
import QuizViewer from "@/app/components/QuizViewer";
import ChatHistory from "@/app/components/ChatHistory";
import DocumentList from "@/app/components/DocumentList";
import { ToastContainer, useToast } from "@/app/components/Toast";

// TypeScript declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

interface QueryResponse {
  answer: string;
  sources: Array<{
    text: string;
    score: number;
    relevanceScore?: number;
    metadata?: Record<string, unknown>;
    isVisual?: boolean;
  }>;
  sessionId?: number;
  confidenceScore?: number;
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
    isVisual?: boolean;
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
type UploadMode = "files" | "link";

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHandsFreeModeEnabled, setIsHandsFreeModeEnabled] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { messages: toastMessages, showToast, closeToast } = useToast();
  const [uploadMode, setUploadMode] = useState<UploadMode>("files");
  const [linkUrl, setLinkUrl] = useState("");

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          addLog(`Voice input: "${transcript}"`);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          addLog(`Voice input error: ${event.error}`);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    // Load hands-free mode preference from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const savedHandsFreeModePreference = localStorage.getItem('handsFreeModeEnabled');
      if (savedHandsFreeModePreference !== null) {
        setIsHandsFreeModeEnabled(savedHandsFreeModePreference === 'true');
      }
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  const handleLinkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    setUploadStatus({ status: "uploading", message: "Processing URL..." });
    addLog(`Starting URL processing: ${linkUrl}`);

    try {
      const res = await fetch("/api/upload/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: linkUrl }),
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus({
          status: "success",
          message: data.message,
          documentsCount: data.documentsCount,
        });
        addLog(`URL processing successful: ${data.documentsCount} chunks created from ${data.type}`);
        setLinkUrl("");
      } else {
        setUploadStatus({
          status: "error",
          message: data.error || "Failed to process URL",
        });
        addLog(`URL processing error: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setUploadStatus({
        status: "error",
        message: errorMessage,
      });
      addLog(`URL processing exception: ${errorMessage}`);
    }
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
        
        // Auto-read answer in hands-free mode
        // Small delay to ensure the UI updates before starting speech
        if (isHandsFreeModeEnabled && data.answer) {
          setTimeout(() => {
            readAloud(data.answer);
          }, 500);
        }
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

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      showToast('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.', 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      addLog('Voice input stopped');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        addLog('Voice input started - speak now...');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        addLog('Failed to start voice input');
        showToast('Failed to start voice input. Please try again.', 'error');
      }
    }
  };

  const readAloud = (text: string) => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      addLog('Stopped reading aloud');
      return;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      addLog('Reading answer aloud...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      addLog('Finished reading aloud');
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      addLog(`Text-to-speech error: ${event.error}`);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleHandsFreeMode = () => {
    const newValue = !isHandsFreeModeEnabled;
    setIsHandsFreeModeEnabled(newValue);
    localStorage.setItem('handsFreeModeEnabled', String(newValue));
    addLog(`Hands-Free Mode ${newValue ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Toast notifications */}
      <ToastContainer messages={toastMessages} onClose={closeToast} />
      
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
          
          {/* Upload Mode Tabs */}
          <div className="flex gap-2 mb-4 border-b border-ink/10">
            <button
              onClick={() => setUploadMode("files")}
              className={`px-4 py-2 font-medium transition-colors ${
                uploadMode === "files"
                  ? "text-accent border-b-2 border-accent"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              📄 Files
            </button>
            <button
              onClick={() => setUploadMode("link")}
              className={`px-4 py-2 font-medium transition-colors ${
                uploadMode === "link"
                  ? "text-accent border-b-2 border-accent"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              🔗 Link
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {uploadMode === "files" ? (
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
            ) : (
              <form onSubmit={handleLinkUpload} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Enter YouTube URL or educational website link..."
                    className="flex-1 px-4 py-3 rounded-lg border border-ink/20 bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink placeholder:text-ink/40"
                  />
                  <button
                    type="submit"
                    disabled={uploadStatus.status === "uploading" || !linkUrl.trim()}
                    className="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadStatus.status === "uploading" ? "Processing..." : "Add"}
                  </button>
                </div>
                <p className="text-xs text-ink/50">
                  Supports YouTube videos and educational websites (Wikipedia, blog posts, etc.)
                </p>
              </form>
            )}

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
              <div className="flex items-center gap-3">
                {/* Hands-Free Mode Toggle */}
                <button
                  onClick={toggleHandsFreeMode}
                  className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                    isHandsFreeModeEnabled
                      ? 'bg-accent text-white'
                      : 'bg-accent/10 text-accent hover:bg-accent/20'
                  }`}
                  title="Auto-read answers aloud"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                  Hands-Free
                </button>
                {currentSessionId && (
                  <button
                    onClick={handleNewChat}
                    className="px-3 py-1 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    + New Chat
                  </button>
                )}
              </div>
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
                type="button"
                onClick={toggleVoiceInput}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-accent/10 text-accent hover:bg-accent/20'
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-ink">💡 Answer</h2>
              <button
                onClick={() => readAloud(response.answer)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSpeaking
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-accent text-white hover:bg-accent/90'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 10h6v4H9z"
                      />
                    </svg>
                    Stop Reading
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                    Read Aloud
                  </>
                )}
              </button>
              {response.confidenceScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink/60">Confidence:</span>
                  <div className={`px-3 py-1 rounded-full font-semibold text-sm ${
                    response.confidenceScore >= 80 ? 'bg-green-100 text-green-800' :
                    response.confidenceScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {response.confidenceScore}%
                  </div>
                </div>
              )}
            </div>
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
                      {source.isVisual && (
                        <div className="mb-2 inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded">
                          🖼️ Visual Description
                        </div>
                      )}
                      <p className="text-sm text-ink/80">{source.text}</p>
                      <div className="flex gap-4 mt-1">
                        {source.relevanceScore !== undefined && (
                          <p className="text-xs text-ink/50">
                            AI Relevance: {source.relevanceScore.toFixed(0)}%
                          </p>
                        )}
                        <p className="text-xs text-ink/50">
                          Similarity: {(source.score * 100).toFixed(1)}%
                        </p>
                      </div>
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
