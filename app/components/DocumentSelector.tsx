"use client";

import { useState, useEffect } from "react";

interface DocumentFile {
  fileName: string;
  chunkCount: number;
  uploadDate: string;
  documentIds: number[];
}

interface DocumentSelectorProps {
  selectedDocumentIds: number[];
  onSelectionChange: (documentIds: number[]) => void;
  className?: string;
}

export default function DocumentSelector({
  selectedDocumentIds,
  onSelectionChange,
  className = "",
}: DocumentSelectorProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/documents");

      if (!res.ok) {
        const response = await res.json();
        throw new Error(response.error?.message || "Failed to load documents");
      }

      const response = await res.json();
      setFiles(response.data?.files || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileToggle = (file: DocumentFile) => {
    const isSelected = file.documentIds.some((id) =>
      selectedDocumentIds.includes(id)
    );

    if (isSelected) {
      // Remove all document IDs for this file
      const newSelection = selectedDocumentIds.filter(
        (id) => !file.documentIds.includes(id)
      );
      onSelectionChange(newSelection);
    } else {
      // Add all document IDs for this file
      const newSelection = [...selectedDocumentIds, ...file.documentIds];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allDocumentIds = filteredFiles.flatMap((file) => file.documentIds);
    onSelectionChange(allDocumentIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const isFileSelected = (file: DocumentFile) => {
    return file.documentIds.some((id) => selectedDocumentIds.includes(id));
  };

  const selectedFilesCount = files.filter((file) =>
    isFileSelected(file)
  ).length;

  if (loading) {
    return (
      <div className={`bg-surface rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-ink/60">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-sm">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface rounded-lg p-4 ${className}`}>
        <div className="text-red-600 text-sm">
          <p className="font-semibold">Error loading documents</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={loadDocuments}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`bg-surface rounded-lg p-4 ${className}`}>
        <p className="text-ink/60 text-sm">
          No documents uploaded yet. Upload some files to select them as context.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg border border-ink/10 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-ink/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-ink hover:text-accent transition-colors"
              aria-expanded={isExpanded}
              aria-controls="document-selector-content"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-semibold">
                📑 Context Documents
              </span>
            </button>
            <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full font-medium">
              {selectedFilesCount === 0
                ? "All documents"
                : `${selectedFilesCount} selected`}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div
          id="document-selector-content"
          className="p-4 space-y-3"
        >
          {/* Search and Actions */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-ink/20 bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink placeholder:text-ink/40"
                aria-label="Search documents"
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
              onClick={handleSelectAll}
              className="px-3 py-2 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors whitespace-nowrap"
              aria-label="Select all documents"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-2 text-xs bg-ink/10 text-ink rounded-lg hover:bg-ink/20 transition-colors whitespace-nowrap"
              aria-label="Deselect all documents"
            >
              Clear
            </button>
          </div>

          {/* Document List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredFiles.length === 0 ? (
              <p className="text-center py-4 text-sm text-ink/60">
                No documents found matching &quot;{searchQuery}&quot;
              </p>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = isFileSelected(file);
                return (
                  <label
                    key={file.fileName}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                        ? "bg-accent/10 border-accent/30 hover:bg-accent/15"
                        : "bg-background border-ink/10 hover:border-accent/20 hover:bg-accent/5"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFileToggle(file)}
                      className="mt-1 w-4 h-4 text-accent border-ink/30 rounded focus:ring-2 focus:ring-accent focus:ring-offset-0 cursor-pointer"
                      aria-label={`Select ${file.fileName}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-ink truncate">
                          {file.fileName}
                        </span>
                        {isSelected && (
                          <span className="text-xs text-accent font-semibold">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-ink/60">
                        <span>{file.chunkCount} chunks</span>
                        <span>•</span>
                        <span>
                          {new Date(file.uploadDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Help Text */}
          <div className="pt-2 border-t border-ink/10">
            <p className="text-xs text-ink/60">
              {selectedFilesCount === 0
                ? "💡 No selection means all documents will be searched"
                : `💡 Only ${selectedFilesCount} selected document${selectedFilesCount === 1 ? "" : "s"
                } will be searched`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
