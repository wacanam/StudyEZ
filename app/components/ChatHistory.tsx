import { useEffect, useState } from "react";

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

interface ChatHistoryProps {
  onSessionSelect: (session: ChatSession) => void;
  onHistoryUpdate: () => void;
  selectedSessionId: number | null;
}

export default function ChatHistory({ onSessionSelect, onHistoryUpdate, selectedSessionId }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/chat-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all chat history? This action cannot be undone.")) {
      return;
    }

    try {
      setIsClearing(true);
      const res = await fetch("/api/chat-sessions", {
        method: "DELETE",
      });

      if (res.ok) {
        setSessions([]);
        onHistoryUpdate();
      } else {
        const data = await res.json();
        alert(`Failed to clear history: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to clear history:", error);
      alert("Failed to clear history. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleSessionClick = async (session: ChatSession) => {
    try {
      // Fetch full session with messages
      const res = await fetch(`/api/chat-sessions/${session.id}`);
      if (res.ok) {
        const data = await res.json();
        onSessionSelect(data.session);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Toggle button for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-4 z-50 lg:hidden bg-accent text-white p-3 rounded-full shadow-lg hover:bg-accent/90 transition-colors"
        aria-label="Toggle history"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* History sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 right-0 h-screen
          w-80 bg-surface border-l border-ink/10
          flex flex-col z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Chat History
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-ink/50 hover:text-ink"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-ink/50 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
              <p className="text-sm">Loading history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-ink/50 py-8">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs mt-1">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors
                    ${
                      selectedSessionId === session.id
                        ? "bg-accent/10 border border-accent/30"
                        : "bg-background hover:bg-accent/5 border border-transparent"
                    }
                  `}
                >
                  <p className="text-sm font-medium text-ink line-clamp-2 mb-1">
                    {session.title || "Untitled Chat"}
                  </p>
                  <p className="text-xs text-ink/50">
                    {formatDate(session.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-ink/10">
          <button
            onClick={handleClearHistory}
            disabled={isClearing || sessions.length === 0}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isClearing ? "Clearing..." : "Clear History"}
          </button>
        </div>
      </aside>
    </>
  );
}
