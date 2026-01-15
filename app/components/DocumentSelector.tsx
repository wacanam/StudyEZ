"use client";

import { useState, useEffect } from "react";

interface DocumentFile {
  fileName: string;
  chunkCount: number;
  uploadDate: string;
  documentIds: number[];
}

interface DocumentSelectorProps {
  selectedFileNames: string[];
  onSelectionChange: (fileNames: string[]) => void;
  className?: string;
}

export default function DocumentSelector({
  selectedFileNames,
  onSelectionChange,
  className = "",
}: DocumentSelectorProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const toggleFileSelection = (fileName: string) => {
    if (selectedFileNames.includes(fileName)) {
      onSelectionChange(selectedFileNames.filter((name) => name !== fileName));
    } else {
      onSelectionChange([...selectedFileNames, fileName]);
    }
  };

  const selectAll = () => {
    onSelectionChange(files.map((file) => file.fileName));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`bg-surface border border-ink/10 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">📄 Document Context</h3>
        </div>
        <div className="text-sm text-ink/60">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">📄 Document Context</h3>
        </div>
        <div className="text-sm text-red-600">Error: {error}</div>
        <button
          onClick={loadDocuments}
          className="mt-2 px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`bg-surface border border-ink/10 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">📄 Document Context</h3>
        </div>
        <div className="text-sm text-ink/60">
          No documents available. Upload some files to use as context.
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-ink/10 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">📄 Document Context</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse document list" : "Expand document list"}
        >
          {isExpanded ? "Hide" : "Show"} ({selectedFileNames.length} selected)
        </button>
      </div>

      {/* Selection Summary (always visible) */}
      <div className="mb-3">
        <div className="text-xs text-ink/70">
          {selectedFileNames.length === 0 ? (
            <span className="text-amber-600">⚠️ All documents will be searched</span>
          ) : selectedFileNames.length === files.length ? (
            <span className="text-green-600">✓ All {files.length} documents selected</span>
          ) : (
            <span className="text-accent">
              ✓ {selectedFileNames.length} of {files.length} documents selected
            </span>
          )}
        </div>
      </div>

      {/* Expanded Document List */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Search and Actions */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="flex-1 px-3 py-1.5 text-xs rounded border border-ink/20 bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-ink placeholder:text-ink/40"
            />
            <button
              onClick={selectAll}
              className="px-2 py-1.5 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors whitespace-nowrap"
              aria-label="Select all documents"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-2 py-1.5 text-xs bg-ink/10 text-ink rounded hover:bg-ink/20 transition-colors whitespace-nowrap"
              aria-label="Clear all selections"
            >
              Clear
            </button>
          </div>

          {/* Document List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredFiles.length === 0 ? (
              <div className="text-xs text-ink/60 text-center py-4">
                No documents found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedFileNames.includes(file.fileName);
                return (
                  <label
                    key={file.fileName}
                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "bg-accent/10 border-2 border-accent"
                        : "bg-background border-2 border-transparent hover:border-ink/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFileSelection(file.fileName)}
                      className="mt-0.5 w-4 h-4 text-accent border-ink/30 rounded focus:ring-2 focus:ring-accent cursor-pointer"
                      aria-label={`${isSelected ? "Deselect" : "Select"} ${file.fileName}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">
                        {file.fileName}
                      </div>
                      <div className="text-xs text-ink/50 mt-0.5">
                        {file.chunkCount} chunk{file.chunkCount !== 1 ? "s" : ""} •{" "}
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-accent"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Helper Text */}
          <div className="text-xs text-ink/50 pt-2 border-t border-ink/10">
            💡 Tip: Select specific documents to narrow the search scope and get more relevant answers.
          </div>
        </div>
      )}
    </div>
  );
}
