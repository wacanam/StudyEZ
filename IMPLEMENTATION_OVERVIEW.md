# Document Context Selection - Implementation Overview

## 🎯 Feature Goal
Enable users to select specific documents as context for AI-powered RAG queries, providing fine-grained control over the knowledge base used for each question.

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Dashboard Component                        │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │         DocumentSelector Component               │  │    │
│  │  │                                                   │  │    │
│  │  │  State: selectedDocumentIds: number[]            │  │    │
│  │  │                                                   │  │    │
│  │  │  UI: [▼] Context Documents [3 selected]          │  │    │
│  │  │      ├─ Search input                             │  │    │
│  │  │      ├─ Select All / Clear buttons               │  │    │
│  │  │      └─ Document list with checkboxes            │  │    │
│  │  │                                                   │  │    │
│  │  │  Events:                                          │  │    │
│  │  │  └─> onSelectionChange([1, 5, 8])               │  │    │
│  │  │       └─> Updates dashboard state                │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  Query Input: "What is photosynthesis?"                │    │
│  │                                                          │    │
│  │  [Ask Button] ────> Triggers API call                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ POST /api/query
                         │ Body: { query, sessionId, documentIds }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │        /app/api/query/route.ts                         │    │
│  │                                                         │    │
│  │  1. Authentication (Clerk middleware)                  │    │
│  │  2. Extract: { query, sessionId, documentIds }         │    │
│  │  3. Validate documentIds (array of numbers)            │    │
│  │  4. Generate embedding for query                       │    │
│  │  5. Call hybridSearch(query, embedding, userId, 10,    │    │
│  │                      documentIds)                      │    │
│  │  6. Rerank results with LLM                            │    │
│  │  7. Generate answer                                    │    │
│  │  8. Save to chat history                               │    │
│  │  9. Return response                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ hybridSearch()
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              lib/db.ts - hybridSearch()                │    │
│  │                                                         │    │
│  │  Parameters:                                           │    │
│  │  - query: string                                       │    │
│  │  - embedding: number[]                                 │    │
│  │  - userId: string                                      │    │
│  │  - limit: number = 10                                  │    │
│  │  - documentIds?: number[]  ← NEW PARAMETER             │    │
│  │                                                         │    │
│  │  SQL Query Logic:                                      │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ WITH vector_search AS (                         │  │    │
│  │  │   SELECT id, content, metadata, rank            │  │    │
│  │  │   FROM documents                                │  │    │
│  │  │   WHERE embedding IS NOT NULL                   │  │    │
│  │  │     AND user_id = $userId                       │  │    │
│  │  │     AND id = ANY($documentIds)  ← FILTER        │  │    │
│  │  │   ORDER BY embedding <=> $embedding             │  │    │
│  │  │ ),                                              │  │    │
│  │  │ fts_search AS (                                 │  │    │
│  │  │   SELECT id, content, metadata, rank            │  │    │
│  │  │   FROM documents                                │  │    │
│  │  │   WHERE user_id = $userId                       │  │    │
│  │  │     AND id = ANY($documentIds)  ← FILTER        │  │    │
│  │  │     AND to_tsvector('english', content)         │  │    │
│  │  │         @@ plainto_tsquery('english', $query)   │  │    │
│  │  │ )                                               │  │    │
│  │  │ SELECT * FROM combined_results                  │  │    │
│  │  │ ORDER BY rrf_score DESC                         │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  Returns: Array<{                                      │    │
│  │    id, content, score, metadata                        │    │
│  │  }>                                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Filtered Results
                         ▼
                    Back to API ──> Format Response ──> Return to UI
```

## �� Data Flow Sequence

```
1. User opens Dashboard
   └─> DocumentSelector fetches documents from /api/documents
       └─> Displays list of user's uploaded files

2. User interacts with DocumentSelector
   ├─> Searches for "biology" 
   │   └─> Client-side filter (no API call)
   ├─> Clicks checkbox on "Biology.pdf"
   │   └─> onSelectionChange([1, 5, 8])
   │       └─> Dashboard updates selectedDocumentIds state
   └─> Sees visual feedback (checkmark, background color)

3. User enters query "What is photosynthesis?"
   └─> Clicks "Ask" button
       └─> Dashboard sends POST /api/query:
           {
             query: "What is photosynthesis?",
             sessionId: 123,
             documentIds: [1, 5, 8]  // From DocumentSelector
           }

4. Backend processes request
   ├─> Authenticates user (Clerk middleware)
   ├─> Validates documentIds (array of numbers)
   ├─> Generates embedding for query
   └─> Calls hybridSearch with documentIds filter

5. Database executes filtered hybrid search
   ├─> Vector search: WHERE id = ANY([1, 5, 8])
   ├─> Full-text search: WHERE id = ANY([1, 5, 8])
   └─> Combines results using RRF algorithm
       └─> Returns only chunks from selected documents

6. Backend completes processing
   ├─> Reranks results with LLM
   ├─> Generates answer from filtered context
   ├─> Saves to chat history
   └─> Returns response to frontend

7. UI displays results
   └─> Answer generated from ONLY selected documents
       └─> Sources shown are from selected files
```

## 🎨 Component Structure

```
DocumentSelector/
├── State
│   ├── files: DocumentFile[]
│   ├── loading: boolean
│   ├── error: string | null
│   ├── searchQuery: string
│   └── isExpanded: boolean
│
├── Props
│   ├── selectedDocumentIds: number[]
│   ├── onSelectionChange: (ids: number[]) => void
│   └── className?: string
│
├── UI Elements
│   ├── Header (Collapsible)
│   │   ├── Toggle icon (▶/▼)
│   │   ├── Title "📑 Context Documents"
│   │   ├── Selection badge
│   │   └── Show/Hide button
│   │
│   └── Content (Expandable)
│       ├── Search input
│       ├── Action buttons (Select All, Clear)
│       ├── Document list (scrollable)
│       │   └── Document items
│       │       ├── Checkbox
│       │       ├── Filename
│       │       ├── Metadata
│       │       └── Selected indicator (✓)
│       └── Help text
│
└── Behavior
    ├── Load documents on mount
    ├── Filter by search query
    ├── Toggle selection on click
    ├── Emit changes via onSelectionChange
    └── Handle edge cases (loading, error, empty)
```

## 💾 Database Schema Impact

```
Documents Table (existing, no changes):
┌────┬─────────┬──────────┬───────────┬─────────┬────────────┐
│ id │ content │ metadata │ embedding │ user_id │ created_at │
├────┼─────────┼──────────┼───────────┼─────────┼────────────┤
│ 1  │ "..."   │ {...}    │ [vector]  │ user123 │ 2025-01-15 │
│ 5  │ "..."   │ {...}    │ [vector]  │ user123 │ 2025-01-15 │
│ 8  │ "..."   │ {...}    │ [vector]  │ user123 │ 2025-01-14 │
│ 12 │ "..."   │ {...}    │ [vector]  │ user123 │ 2025-01-14 │
└────┴─────────┴──────────┴───────────┴─────────┴────────────┘

Query WITHOUT documentIds:
  SELECT * FROM documents WHERE user_id = 'user123'
  → Returns ALL user documents

Query WITH documentIds [1, 5, 8]:
  SELECT * FROM documents 
  WHERE user_id = 'user123' 
    AND id = ANY(ARRAY[1, 5, 8])
  → Returns ONLY documents 1, 5, and 8
```

## 🧩 Integration Points

### 1. Frontend → Backend
```typescript
// Dashboard sends request
fetch('/api/query', {
  method: 'POST',
  body: JSON.stringify({
    query: userQuestion,
    sessionId: currentSessionId,
    documentIds: selectedDocumentIds.length > 0 
      ? selectedDocumentIds 
      : undefined
  })
})
```

### 2. Backend → Database
```typescript
// API route calls database function
const candidateDocs = await hybridSearch(
  query,
  queryEmbedding,
  userId,
  10,
  filteredDocumentIds  // undefined = search all
);
```

### 3. Component → Dashboard
```typescript
// DocumentSelector notifies parent
<DocumentSelector
  selectedDocumentIds={selectedDocumentIds}
  onSelectionChange={(newIds) => {
    setSelectedDocumentIds(newIds);
    // Dashboard state updated
  }}
/>
```

## 📊 Performance Characteristics

### Without Filtering (Baseline)
- Searches ALL user documents (~100-1000s)
- Returns top 10 candidates
- LLM reranks to top 3

### With Filtering (New)
- Searches ONLY selected documents (~1-10)
- Same return limit (top 10 candidates)
- Same reranking process
- **Result:** Faster query, more focused results

### SQL Performance
```sql
-- Without filter: Table scan with vector index
WHERE user_id = 'user123'
  AND embedding IS NOT NULL
→ Uses: user_id index + vector index

-- With filter: Additional array membership check
WHERE user_id = 'user123'
  AND embedding IS NOT NULL
  AND id = ANY(ARRAY[1, 5, 8])
→ Uses: Same indexes + O(n) array check
→ Impact: Minimal (array is small)
```

## 🔒 Security Considerations

1. **Authentication**
   - Clerk middleware ensures only authenticated users
   - userId from auth token, not request body

2. **Authorization**
   - Users can only search THEIR documents
   - Document IDs validated against user ownership
   - SQL: `WHERE user_id = $userId`

3. **Input Validation**
   ```typescript
   // Validate documentIds
   if (documentIds !== undefined) {
     if (!Array.isArray(documentIds)) {
       return ErrorHandler.badRequest("documentIds must be an array");
     }
     if (!documentIds.every(id => typeof id === "number")) {
       return ErrorHandler.badRequest("All documentIds must be numbers");
     }
   }
   ```

4. **SQL Injection Prevention**
   - Prisma parameterized queries
   - No string concatenation
   - Array passed as parameter: `$queryRaw<...>\`...\``

## 🎯 Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No documents uploaded | Shows "No documents yet" message |
| All documents selected | Equivalent to none selected (optimization) |
| No documents selected | Searches all user documents (default) |
| Invalid document IDs | Validation error returned |
| Document deleted while selected | Ignored in query (won't exist in DB) |
| Search returns no results | Shows "No documents found" |
| API error during fetch | Shows error with retry button |
| Loading state | Shows spinner, prevents interaction |

## 📈 Future Enhancements

1. **Persistence**
   - Save selection in localStorage
   - Restore on page load

2. **Advanced Filtering**
   - Filter by upload date
   - Filter by document type
   - Filter by size

3. **Batch Operations**
   - Delete selected documents
   - Download selected documents

4. **UI Improvements**
   - Document preview on hover
   - Drag-and-drop reordering
   - Document grouping

5. **Analytics**
   - Track which documents used most
   - Suggest documents for queries
   - Show usage statistics

## 📚 Documentation Index

- **FEATURE_SUMMARY.md** - Quick reference and overview
- **DOCUMENT_SELECTOR_DESIGN.md** - Complete design specification
- **DOCUMENT_SELECTOR_MOCKUPS.md** - Visual mockups and diagrams
- **IMPLEMENTATION_OVERVIEW.md** - This file (architecture)

## ✅ Implementation Checklist

- [x] Component created with TypeScript
- [x] Props interface defined
- [x] Multi-select functionality
- [x] Search/filter capability
- [x] Collapsible UI
- [x] Responsive design
- [x] Accessibility features
- [x] Loading/error states
- [x] Dashboard integration
- [x] Backend API updated
- [x] Database function modified
- [x] Input validation
- [x] Backward compatibility
- [x] TypeScript compilation passes
- [x] Documentation complete

## 🎉 Status: COMPLETE

All acceptance criteria met. Feature is ready for review and testing.
