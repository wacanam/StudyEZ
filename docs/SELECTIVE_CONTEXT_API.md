# Selective Context Inclusion API

## Overview
The `/api/query` endpoint now supports selective context inclusion, allowing users to restrict RAG queries to specific documents or files.

## API Endpoint: `/api/query`

### Request Format

```typescript
POST /api/query

{
  "query": string,              // Required: The user's question
  "sessionId": number,          // Optional: Chat session ID
  "documentIds": number[]       // Optional: Array of document IDs to search within
}
```

### Parameters

- **query** (required, string): The user's question or query
- **sessionId** (optional, number): ID of the chat session to continue
- **documentIds** (optional, number[]): Array of document IDs to restrict search to
  - If omitted or empty, searches across all user documents (default behavior)
  - If provided, only searches within the specified documents
  - Invalid or unauthorized document IDs will result in a 400 error

### Response Format

```typescript
{
  "success": true,
  "data": {
    "answer": string,           // AI-generated response
    "sources": SourceDocument[], // Source documents used
    "sessionId": number,         // Session ID for this conversation
    "confidenceScore": number    // Confidence score (0-100)
  }
}
```

### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "error": "Invalid or unauthorized document IDs: 123, 456"
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Usage Examples

### Example 1: Query All Documents (Original Behavior)
```typescript
const response = await fetch('/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What are the key concepts in quantum mechanics?",
    sessionId: 42
  })
});
```

### Example 2: Query Specific Documents
```typescript
const response = await fetch('/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Explain photosynthesis",
    documentIds: [101, 102, 103], // Only search these documents
    sessionId: 42
  })
});
```

### Example 3: New Session with Selected Documents
```typescript
const response = await fetch('/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Summarize the main points",
    documentIds: [205, 206]
  })
});
```

## Implementation Details

### Type Safety
All request parameters are validated using TypeScript type guards:
- `isQueryRequest()` validates the entire request structure
- No `any` types are used in the implementation

### Security
- **Authentication**: All requests require valid user authentication via Clerk
- **Authorization**: Document ownership is validated before querying
  - `validateDocumentOwnership()` ensures all document IDs belong to the authenticated user
  - Attempting to access unauthorized documents returns a 400 error with specific IDs listed
- **SQL Injection Prevention**: All database queries use parameterized queries via Prisma

### Performance
- Filtering is done at the database level using efficient SQL `ANY(ARRAY[...])` syntax
- Hybrid search (vector + full-text) is applied only to the selected documents
- Re-ranking with Gemini AI is applied to the filtered results

### Backward Compatibility
- Existing queries without `documentIds` work exactly as before
- The `hybridSearchFiltered()` function delegates to `hybridSearch()` when no IDs are provided
- All existing functionality is preserved

## Architecture

### Modified Components

1. **lib/types/api-types.ts**
   - Added `QueryRequest` interface
   - Added `isQueryRequest()` type guard

2. **lib/db.ts**
   - Added `validateDocumentOwnership()` function
   - Added `hybridSearchFiltered()` function

3. **app/api/query/route.ts**
   - Updated to accept and validate `documentIds`
   - Uses `hybridSearchFiltered()` instead of `hybridSearch()`
   - Enhanced error messages for context-specific feedback

### Design Principles Applied

- **SOLID Principles**: Business logic in services (db.ts), not routes
- **DRY**: Reuses existing `hybridSearch()` for non-filtered queries
- **Type Safety**: Strict TypeScript typing throughout
- **Security**: User isolation enforced at all levels
- **Single Responsibility**: Each function has one clear purpose

## Testing

### Manual Testing

To test the selective context feature:

1. **Get Document IDs**:
   ```bash
   curl -X GET https://your-app/api/documents \
     -H "Authorization: Bearer <token>"
   ```

2. **Query Specific Documents**:
   ```bash
   curl -X POST https://your-app/api/query \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "query": "Your question here",
       "documentIds": [1, 2, 3]
     }'
   ```

3. **Test Invalid Document IDs**:
   ```bash
   curl -X POST https://your-app/api/query \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "query": "Your question here",
       "documentIds": [99999]
     }'
   ```
   Should return 400 error with "Invalid or unauthorized document IDs: 99999"

### Type Checking
```bash
npm run lint
```

## Future Enhancements

Potential improvements:
- Add file-level filtering (in addition to document chunk IDs)
- Support document ID ranges
- Add metadata-based filtering (e.g., by upload date, file type)
- Cache validation results for repeated queries
- Add query parameter for "exclude" instead of "include" mode
