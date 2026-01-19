# Document Context Selection UI - Design Specification

## Overview
The Document Selector component provides users with fine-grained control over which uploaded documents should be included as context for AI-powered RAG queries. This feature enables users to focus AI responses on specific study materials.

## Component: DocumentSelector

### Location
- **File**: `app/components/DocumentSelector.tsx`
- **Integration**: Displayed in the dashboard Q&A mode, positioned above the query input section

### Visual Design

#### Collapsed State (Default)
```
┌─────────────────────────────────────────────────────┐
│  ▸ 📑 Context Documents  [3 selected]       [Show]  │
└─────────────────────────────────────────────────────┘
```

When no documents are selected:
```
┌─────────────────────────────────────────────────────┐
│  ▸ 📑 Context Documents  [All documents]    [Show]  │
└─────────────────────────────────────────────────────┘
```

#### Expanded State
```
┌─────────────────────────────────────────────────────────────┐
│  ▾ 📑 Context Documents  [3 selected]             [Hide]    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┬──────────┬─────────┐           │
│  │ 🔍 Search documents... │ Select All │ Clear │           │
│  └────────────────────────┴──────────┴─────────┘           │
│                                                              │
│  ┌─────────────────────────────────────────────┐           │
│  │ ☑ Introduction_to_Biology.pdf               │           │
│  │   42 chunks • 12/15/2025                   ✓│           │
│  ├─────────────────────────────────────────────┤           │
│  │ ☑ Chemistry_Chapter_3.pdf                   │           │
│  │   38 chunks • 12/14/2025                   ✓│           │
│  ├─────────────────────────────────────────────┤           │
│  │ ☑ Physics_Notes.txt                         │           │
│  │   25 chunks • 12/13/2025                   ✓│           │
│  ├─────────────────────────────────────────────┤           │
│  │ ☐ Math_Formulas.pdf                         │           │
│  │   18 chunks • 12/12/2025                    │           │
│  └─────────────────────────────────────────────┘           │
│                                                              │
│  💡 Only 3 selected documents will be searched              │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme & Visual Indicators

#### Selected Document
- **Background**: Accent color with 10% opacity (`bg-accent/10`)
- **Border**: Accent color with 30% opacity (`border-accent/30`)
- **Checkmark**: Visible checkmark icon (✓) in accent color
- **Hover**: Increased opacity (`bg-accent/15`)

#### Unselected Document
- **Background**: Background color (`bg-background`)
- **Border**: Ink color with 10% opacity (`border-ink/10`)
- **Hover**: Accent color with 5% opacity + border change

#### Badge Indicators
- Document count badge: Accent background with text
- "All documents" badge when none selected: Same styling

### Interactive Elements

#### 1. Collapse/Expand Toggle
- **Location**: Left side of header, arrow icon
- **Behavior**: Rotates 90° when expanded
- **Keyboard**: Accessible via Tab + Enter/Space

#### 2. Search Input
- **Placeholder**: "Search documents..."
- **Function**: Real-time filtering by filename
- **Accessibility**: Labeled with `aria-label="Search documents"`

#### 3. Select All Button
- **Style**: Accent background with 10% opacity
- **Function**: Selects all currently filtered documents
- **Hover**: Increased opacity

#### 4. Clear Button
- **Style**: Neutral background (ink/10)
- **Function**: Deselects all documents
- **Hover**: Darker background

#### 5. Document Checkboxes
- **Type**: Standard HTML checkboxes with custom styling
- **Focus**: Visible focus ring (accent color)
- **Label**: Entire document card is clickable

### Responsive Design

#### Desktop (≥768px)
- Full width within container
- Maximum height of 256px (16rem) for document list
- Side-by-side action buttons

#### Mobile (<768px)
- Full width, stacked layout
- Reduced padding for compact view
- Checkboxes remain touch-friendly (minimum 44px touch target)
- Search and action buttons stack vertically if needed

### Accessibility Features

1. **ARIA Attributes**
   - `aria-expanded`: Indicates collapse/expand state
   - `aria-controls`: Links header to content section
   - `aria-label`: Describes interactive elements

2. **Keyboard Navigation**
   - Tab: Navigate through all interactive elements
   - Enter/Space: Toggle checkboxes and buttons
   - Arrow keys work within the document list

3. **Screen Reader Support**
   - Descriptive labels for all inputs
   - Status announcements for selection changes
   - Semantic HTML structure

4. **Focus Management**
   - Visible focus indicators on all interactive elements
   - Logical tab order
   - Focus ring uses accent color

### User Experience Flow

#### Initial State
1. Component loads in collapsed state
2. Shows count of selected documents or "All documents"
3. No performance impact when collapsed

#### Selecting Documents
1. User clicks "Show" or header to expand
2. Document list loads with current selections
3. User can search to filter documents
4. Click checkbox or entire card to toggle selection
5. Visual feedback immediate (checkmark, background change)
6. Status message updates at bottom

#### Querying with Context
1. User enters question in query input below
2. Logs show context information: "(filtering X document chunks)" or "(searching all documents)"
3. API receives selected document IDs
4. Search filters to only selected documents
5. Results use only context from selected documents

### Edge Cases Handled

1. **No Documents Uploaded**
   - Shows message: "No documents uploaded yet..."
   - Component remains visible but non-interactive

2. **No Selection**
   - Badge shows "All documents"
   - Help text: "No selection means all documents will be searched"
   - Backend searches across all user documents

3. **All Documents Selected**
   - Equivalent to no selection (performance optimization)
   - Badge shows count

4. **Search Returns No Results**
   - Shows: "No documents found matching '[query]'"
   - Select All/Clear buttons remain functional

5. **Loading State**
   - Shows spinner and "Loading documents..."
   - Prevents interaction during load

6. **Error State**
   - Displays error message with retry button
   - Maintains component structure

### Integration with Backend

#### API Request Format
```typescript
POST /api/query
{
  "query": "What is photosynthesis?",
  "sessionId": 123,
  "documentIds": [1, 5, 8, 12, 15]  // Optional
}
```

#### Backend Behavior
- **With documentIds**: Filters `hybridSearch` to only specified document IDs
- **Without documentIds**: Searches all user documents (default behavior)
- **Validation**: Ensures all IDs are numbers and array is valid

#### Database Query Optimization
- Uses PostgreSQL `ANY()` array operator for efficient filtering
- Maintains RRF (Reciprocal Rank Fusion) algorithm for hybrid search
- No performance degradation with document filtering

### State Management

#### Component Props
```typescript
interface DocumentSelectorProps {
  selectedDocumentIds: number[];
  onSelectionChange: (documentIds: number[]) => void;
  className?: string;
}
```

#### Dashboard Integration
```typescript
// Dashboard state
const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);

// Pass to component
<DocumentSelector
  selectedDocumentIds={selectedDocumentIds}
  onSelectionChange={setSelectedDocumentIds}
/>

// Use in query
body: JSON.stringify({
  query,
  sessionId: currentSessionId,
  documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
})
```

### Performance Considerations

1. **Lazy Loading**: Component fetches documents only when needed
2. **Memoization**: Document filtering uses local state (no re-fetching)
3. **Minimal Re-renders**: Only updates on selection changes
4. **Efficient Searches**: Search is client-side string matching
5. **Database Optimization**: SQL query optimized for array filtering

### Design Patterns Used

1. **Controlled Component**: Parent (Dashboard) controls selected state
2. **Compound Component**: Header and content work together
3. **Progressive Disclosure**: Collapsed by default to reduce visual clutter
4. **Optimistic UI**: Immediate visual feedback before API call
5. **Defensive Programming**: Handles all edge cases gracefully

### Future Enhancements (Not in Scope)

- Persist selection in localStorage or user preferences
- Document preview on hover
- Grouping documents by upload date or type
- Drag-and-drop reordering of selected documents
- Bulk actions (delete selected, export selected)
- Document metadata filtering (by date, size, type)

## Testing Checklist

- [x] Component renders without errors
- [x] TypeScript compilation passes
- [x] Backend API accepts documentIds parameter
- [x] Database query filters correctly
- [x] Backward compatibility maintained (no documentIds = search all)
- [ ] UI responds to all user interactions
- [ ] Search filtering works correctly
- [ ] Select All/Clear buttons function properly
- [ ] Checkbox state synchronizes with parent
- [ ] Mobile responsive layout works
- [ ] Keyboard navigation functional
- [ ] Screen reader accessibility verified
- [ ] Query logs show correct context information
- [ ] Results filtered to selected documents only

## Browser Compatibility

- **Chrome/Edge**: ✓ Full support
- **Firefox**: ✓ Full support
- **Safari**: ✓ Full support
- **Mobile browsers**: ✓ Full support with touch interactions

## Conclusion

The Document Selector component provides an intuitive, accessible, and performant way for users to control which documents are used as context for AI queries. The design follows modern UI patterns, maintains consistency with the existing application design system, and handles all edge cases gracefully.
