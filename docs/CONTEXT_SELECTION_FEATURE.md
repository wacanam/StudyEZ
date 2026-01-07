# Context Selection Feature

## Overview
The Context Selection feature allows users to select specific uploaded documents to use as reference context when the AI answers their questions. This gives users more control over which materials are considered when generating responses.

## User Experience

### Default Behavior (Backward Compatible)
- If no documents are selected, the AI uses **all uploaded documents** as context
- This maintains the original behavior of the application

### With Selection
- Users can select specific files/documents before asking a question
- Only the selected documents' chunks are used as context for the RAG pipeline
- A visual indicator shows how many chunks are selected
- Users can easily "Select All" or "Clear" selection

## Implementation Details

### Backend Changes

#### 1. Database Layer (`lib/db.ts`)
**Modified Function:** `hybridSearch()`

**New Parameter:** `documentIds?: number[]`
- **undefined**: Search all user's documents (default, backward compatible)
- **empty array []**: Return no results (no documents to search)
- **array of IDs**: Search only within those document IDs

**Security:**
- Integer validation to prevent SQL injection
- Authorization happens at API layer (documents must belong to user)

**SQL Query:**
- Uses PostgreSQL `ANY()` operator for efficient filtering
- Applies filter to both vector and full-text search CTEs
- Maintains same RRF (Reciprocal Rank Fusion) algorithm

#### 2. API Layer (`app/api/query/route.ts`)
**New Request Parameter:** `selectedDocumentIds?: number[]`

**Validation:**
1. Must be an array if provided
2. All elements must be integers
3. All document IDs must belong to the authenticated user (authorization check)
4. Empty array handled explicitly (returns no results)

**Error Responses:**
- `400 Bad Request` if validation fails
- Specific error messages for different validation failures

### Frontend Changes

#### 1. DocumentList Component (`app/components/DocumentList.tsx`)
**New Props:**
- `selectionMode?: boolean` - Enable selection UI
- `selectedDocumentIds?: number[]` - Currently selected chunk IDs
- `onSelectionChange?: (ids: number[]) => void` - Callback for selection changes

**Selection Logic:**
- Operates at file level (selecting a file selects all its chunks)
- Uses Set for O(1) lookup performance
- Prevents duplicate IDs

**UI Changes:**
- Shows checkboxes in selection mode
- "Select All" and "Clear" buttons
- Shows count of selected chunks
- Hides management buttons (rename, delete) in selection mode

#### 2. Dashboard Page (`app/dashboard/page.tsx`)
**New State:** `selectedDocumentIds: number[]`

**UI Integration:**
- Document selection section added in Q&A mode
- Shows hint: "(All documents will be used if none selected)"
- Compact, scrollable list with max height

**Query Integration:**
- Passes `selectedDocumentIds` to `/api/query` endpoint
- Only sends if non-empty (maintains backward compatibility)

## Security Considerations

### Authorization
- **Critical:** API validates all selected document IDs belong to the requesting user
- Prevents unauthorized access to other users' documents
- Validation happens before any database queries

### SQL Injection Prevention
- All document IDs validated as integers at API layer
- Additional defensive check in database layer
- PostgreSQL parameterized queries used throughout

### Performance
- Set-based lookups for O(1) complexity
- No performance degradation with large document collections
- Database queries maintain efficient indexing

## Usage Example

### API Request
```javascript
// No selection - use all documents (default)
POST /api/query
{
  "query": "What is machine learning?",
  "sessionId": 123
}

// With selection - use only specified documents
POST /api/query
{
  "query": "What is machine learning?",
  "sessionId": 123,
  "selectedDocumentIds": [1, 2, 3, 4, 5]
}
```

### Frontend Usage
```typescript
// In a React component
<DocumentList
  selectionMode={true}
  selectedDocumentIds={selectedDocumentIds}
  onSelectionChange={setSelectedDocumentIds}
/>
```

## Testing

### Logic Tests
✅ File selection/deselection
✅ Select all functionality
✅ Clear selection
✅ Backward compatibility (undefined means all documents)

### Security Tests
✅ Authorization check for document ownership
✅ SQL injection prevention
✅ Input validation

### Performance Tests
✅ O(1) lookup complexity with Set
✅ No duplicate ID generation

## Future Enhancements

### Potential Improvements
1. **Persistent Selection**: Remember last selection across sessions
2. **Smart Selection**: AI-suggested relevant documents based on query
3. **Folder/Tag System**: Group documents for easier bulk selection
4. **Visual Preview**: Show document snippets in selection UI
5. **Search Within Selection**: Filter documents while maintaining selection

### API Extensions
- Add `documentFilter` parameter for more complex filtering
- Support tag-based selection
- Add document relevance scoring preview

## Troubleshooting

### Issue: Selection not working
**Solution:** Ensure `selectionMode={true}` is set on DocumentList component

### Issue: "Invalid document IDs" error
**Possible Causes:**
1. Document IDs don't belong to the current user
2. Document IDs are not integers
3. Document IDs don't exist in database

### Issue: Empty results with selection
**Solution:** Verify selected documents contain relevant content for the query

## Code Quality

### Principles Followed
- ✅ **SOLID**: Single responsibility, separation of concerns
- ✅ **DRY**: No code duplication
- ✅ **Type Safety**: Full TypeScript typing, no `any` types
- ✅ **Security First**: Authorization and validation at every layer
- ✅ **Performance**: Optimized algorithms and data structures
- ✅ **Backward Compatibility**: Existing functionality preserved

### Review Results
- ✅ Code review passed
- ✅ Security scan passed (CodeQL)
- ✅ TypeScript compilation successful
- ✅ All review feedback addressed
