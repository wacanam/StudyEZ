"use client";

import { useState, useEffect } from "react";
import { useToast, ToastContainer } from "./Toast";

interface DocumentFile {
  fileName: string;
  chunkCount: number;
  uploadDate: string;
  documentIds: number[];
}

interface DocumentListProps {
  onUpdate?: () => void;
}

export default function DocumentList({ onUpdate }: DocumentListProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { messages, showToast, closeToast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/documents");
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load documents");
      }
      
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (fileName: string) => {
    setShowDeleteConfirm(fileName);
  };

  const handleDeleteConfirm = async (fileName: string) => {
    setShowDeleteConfirm(null);

    try {
      setActionLoading(fileName);
      const encodedFileName = encodeURIComponent(fileName);
      const res = await fetch(`/api/upload/${encodedFileName}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete document");
      }

      // Reload documents after successful deletion
      await loadDocuments();
      if (onUpdate) onUpdate();
      
      showToast(data.message, "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showToast(`Error: ${errorMessage}`, "error");
      console.error("Error deleting document:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRename = async (oldFileName: string) => {
    if (!newFileName.trim()) {
      showToast("Please enter a new file name", "error");
      return;
    }

    try {
      setActionLoading(oldFileName);
      const encodedFileName = encodeURIComponent(oldFileName);
      const res = await fetch(`/api/upload/${encodedFileName}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newFileName: newFileName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to rename document");
      }

      // Reload documents after successful rename
      await loadDocuments();
      if (onUpdate) onUpdate();
      
      setRenamingFile(null);
      setNewFileName("");
      showToast(data.message, "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showToast(`Error: ${errorMessage}`, "error");
      console.error("Error renaming document:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink/60">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-semibold">Error loading documents</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadDocuments}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToastContainer messages={messages} onClose={closeToast} />
      
      {/* Search Bar */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full px-4 py-2 pl-10 rounded-lg border border-ink/20 bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink placeholder:text-ink/40"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          onClick={loadDocuments}
          className="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
          title="Refresh list"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Document List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-ink/60">
          {searchQuery ? (
            <p>No documents found matching &quot;{searchQuery}&quot;</p>
          ) : (
            <p>No documents uploaded yet. Upload some files to get started!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">
            Showing {filteredFiles.length} of {files.length} document{files.length !== 1 ? "s" : ""}
          </p>
          {filteredFiles.map((file) => (
            <div
              key={file.fileName}
              className="bg-background border border-ink/10 rounded-lg p-4 hover:border-accent/30 transition-colors"
            >
              {renamingFile === file.fileName ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Enter new file name..."
                    className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRename(file.fileName)}
                      disabled={actionLoading === file.fileName}
                      className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {actionLoading === file.fileName ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setRenamingFile(null);
                        setNewFileName("");
                      }}
                      disabled={actionLoading === file.fileName}
                      className="px-4 py-2 bg-ink/10 text-ink rounded-lg hover:bg-ink/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">
                      📄 {file.fileName}
                    </h3>
                    <div className="flex gap-4 mt-2 text-sm text-ink/60">
                      <span>{file.chunkCount} chunk{file.chunkCount !== 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRenamingFile(file.fileName);
                        setNewFileName(file.fileName);
                      }}
                      disabled={actionLoading === file.fileName}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      title="Rename"
                    >
                      ✏️ Rename
                    </button>
                    <button
                      onClick={() => handleDeleteClick(file.fileName)}
                      disabled={actionLoading === file.fileName}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      title="Delete"
                    >
                      {actionLoading === file.fileName ? "Deleting..." : "🗑️ Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-ink mb-4">
              Confirm Deletion
            </h3>
            <p className="text-ink/70 mb-6">
              Are you sure you want to delete &quot;{showDeleteConfirm}&quot; and all its chunks? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-ink/10 text-ink rounded-lg hover:bg-ink/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
