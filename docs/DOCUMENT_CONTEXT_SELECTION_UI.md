# Document Context Selection UI - Design Specification

## Overview
This document describes the implementation of the Document Context Selection UI feature, which allows users to select specific documents as context for their AI-powered queries in StudyEZ.

## Feature Description
The Document Context Selection UI enables users to:
- View all their uploaded documents in an organized list
- Select multiple documents to use as context for queries
- Clearly see which documents are selected/unselected
- Search and filter documents
- Select all or clear all selections with one click
- Get visual feedback about the selection state

## User Interface Components

### 1. DocumentSelector Component
**Location**: `app/components/DocumentSelector.tsx`

#### Component Structure
```
┌─────────────────────────────────────────────┐
│ 📄 Document Context            Show (X selected)│
├─────────────────────────────────────────────┤
│ ⚠️ All documents will be searched          │
│ (or)                                        │
│ ✓ X of Y documents selected                │
└─────────────────────────────────────────────┘

When expanded:
┌─────────────────────────────────────────────┐
│ 📄 Document Context            Hide (X selected)│
├─────────────────────────────────────────────┤
│ ✓ X of Y documents selected                │
├─────────────────────────────────────────────┤
│ [Search documents...]  [Select All] [Clear] │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ ☐ document1.pdf                        │ │
│ │   15 chunks • Jan 14, 2026             │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ document2.txt                     ✓  │ │
│ │   23 chunks • Jan 13, 2026             │ │
│ └─────────────────────────────────────────┘ │
│ (scrollable list)                          │
├─────────────────────────────────────────────┤
│ 💡 Tip: Select specific documents to       │
│    narrow the search scope                 │
└─────────────────────────────────────────────┘
```

#### Visual States

##### Collapsed State
- Shows summary of selection: "X selected"
- Minimal space usage
- Click to expand

##### Expanded State
- Shows full document list with checkboxes
- Search bar for filtering
- Select All / Clear buttons
- Scrollable list (max height: 240px)
- Helper tip at bottom

##### Selection States

**No Selection (Default)**
- Warning indicator: ⚠️ "All documents will be searched"
- Orange/amber color scheme
- Indicates broad search scope

**Partial Selection**
- Success indicator: ✓ "X of Y documents selected"
- Accent color (orange)
- Shows exact count

**All Selected**
- Success indicator: ✓ "All X documents selected"
- Green color scheme
- Indicates complete selection

#### Interactive Elements

**Document List Item**
- Checkbox for selection
- File name (truncated if long)
- Metadata: chunk count and upload date
- Hover state: border highlight
- Selected state: accent background + border + checkmark icon
- Unselected state: neutral background

**Search Input**
- Placeholder: "Search documents..."
- Real-time filtering
- Shows "No documents found" if no matches

**Action Buttons**
- "Select All": Selects all visible documents
- "Clear": Deselects all documents
- Both have hover states

### 2. Integration with Dashboard
**Location**: `app/dashboard/page.tsx`

The DocumentSelector is integrated into the Q&A mode section:

```
┌─────────────────────────────────────────────┐
│ 🔍 Ask a Question        [Hands-Free] [New] │
├─────────────────────────────────────────────┤
│                                             │
│ [Document Context Selector Component]      │
│                                             │
├─────────────────────────────────────────────┤
│ [Query Input Field]  [🎤] [Ask]            │
└─────────────────────────────────────────────┘
```

## Color Scheme

### Based on StudyEZ Theme
- **Background**: `#FAF3E1` (warm cream)
- **Surface**: `#F5E7C6` (light tan)
- **Accent**: `#FF6D1F` (orange)
- **Ink**: `#222222` (dark gray)

### Component Colors
- **Selected state**: Accent with 10% opacity background, accent border
- **Unselected state**: Background color with transparent border
- **Hover state**: Border with ink at 20% opacity
- **Warning state**: Amber-600 (#D97706)
- **Success state**: Green-600 (#16A34A) for "all selected"

## Typography

### Font Sizes
- **Heading**: 14px (0.875rem), font-semibold
- **Body text**: 12px (0.75rem)
- **Metadata**: 12px (0.75rem), 50% opacity

### Font Weights
- **Headings**: 600 (semibold)
- **Body**: 400 (normal)
- **Selected items**: 500 (medium)

## Spacing & Layout

### Component Spacing
- **Padding**: 16px (1rem) main container
- **Gap between elements**: 12px (0.75rem)
- **List item padding**: 10px (0.625rem)
- **Border radius**: 8px (0.5rem) for containers, 6px for items

### Responsive Behavior
- **Desktop**: Full width with proper spacing
- **Mobile**: Adapts to smaller screens, maintains usability
- **Scrollable area**: Max height 240px with custom scrollbar

## Accessibility Features

### ARIA Labels
- `aria-expanded`: Indicates expanded/collapsed state
- `aria-label`: Descriptive labels for buttons and checkboxes
  - "Select all documents"
  - "Clear all selections"
  - "Select/Deselect [filename]"
  - "Expand/Collapse document list"

### Keyboard Navigation
- Tab navigation through interactive elements
- Space/Enter to toggle checkboxes
- Native checkbox behavior

### Screen Reader Support
- Clear state announcements
- Descriptive button labels
- Proper form semantics

### Focus States
- Visible focus rings on interactive elements
- Accent color focus (2px ring)

## User Flow

### Initial State
1. User navigates to Dashboard → Q&A Mode
2. DocumentSelector shows in collapsed state
3. If no documents uploaded: Shows "No documents available" message

### Selection Flow
1. User clicks "Show" to expand selector
2. Sees list of all uploaded documents
3. Can search to filter list
4. Clicks checkboxes to select/deselect documents
5. Can use "Select All" or "Clear" for batch operations
6. Clicks "Hide" to collapse selector
7. Selection state is preserved

### Query Flow
1. User selects specific documents (optional)
2. User enters query in input field
3. User clicks "Ask" button
4. System sends query with selectedDocuments array to API
5. API filters search to only selected documents
6. Results are displayed with sources from selected documents

### Edge Cases
- **No documents uploaded**: Component shows informational message
- **No selection**: Warning indicator, searches all documents
- **All selected**: Success indicator, effectively same as no filter
- **Search with no results**: Shows "No documents found" message
- **Loading state**: Shows "Loading documents..." message
- **Error state**: Shows error message with retry button

## Technical Implementation

### State Management
```typescript
const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
```

### API Integration

#### Request Format
```json
{
  "query": "What is photosynthesis?",
  "sessionId": 123,
  "selectedDocuments": ["biology-notes.pdf", "plant-science.txt"]
}
```

#### Database Filtering
The `hybridSearch` function in `lib/db.ts` filters documents by filename:
```sql
WHERE (metadata->>'fileName')::text = ANY(ARRAY['file1.pdf', 'file2.txt'])
```

### Performance Considerations
- Lazy loading: Documents fetched only when component mounts
- Efficient filtering: Client-side search on pre-loaded data
- Minimal re-renders: State updates only when necessary
- Database optimization: Uses existing metadata JSON field

## Interaction Design

### Animation & Transitions
- Smooth expand/collapse animation (duration: 200ms)
- Hover state transitions (duration: 150ms)
- Color transitions on state changes
- Subtle fade-in for list items

### Feedback Mechanisms
- Visual selection state (checkmark, border, background)
- Count indicator in collapsed state
- Warning/success indicators
- Hover effects on interactive elements

## Mobile Responsiveness

### Touch Targets
- Minimum 44px touch targets for buttons and checkboxes
- Adequate spacing between interactive elements
- Tap-friendly checkbox areas

### Layout Adjustments
- Full-width design on mobile
- Scrollable list maintains usability
- Buttons stack if needed on narrow screens
- Font sizes remain readable

## Future Enhancements

### Potential Improvements
1. **Document Tags**: Group documents by tags/categories
2. **Smart Selection**: Suggest relevant documents based on query
3. **Recent Documents**: Quick access to recently used documents
4. **Favorites**: Star/favorite frequently used documents
5. **Bulk Actions**: Select by date range, file type, etc.
6. **Preview**: Quick preview of document content on hover
7. **Statistics**: Show how often documents are used
8. **Persistence**: Remember selection across sessions

## Testing Checklist

### Functional Testing
- [ ] Component loads all documents correctly
- [ ] Search filters documents in real-time
- [ ] Select/deselect individual documents works
- [ ] Select All selects all visible documents
- [ ] Clear deselects all documents
- [ ] Expand/collapse toggles view
- [ ] Selection state persists when collapsed
- [ ] API receives correct selectedDocuments array
- [ ] Query results respect document selection

### Visual Testing
- [ ] Component matches design specification
- [ ] Colors match StudyEZ theme
- [ ] Typography is consistent
- [ ] Spacing is correct
- [ ] Mobile layout works properly
- [ ] Hover states are visible
- [ ] Focus states are visible

### Accessibility Testing
- [ ] Screen reader can navigate component
- [ ] ARIA labels are present and correct
- [ ] Keyboard navigation works
- [ ] Focus order is logical
- [ ] Color contrast meets WCAG AA standards
- [ ] Interactive elements have proper labels

### Edge Case Testing
- [ ] Works with 0 documents
- [ ] Works with 1 document
- [ ] Works with 100+ documents
- [ ] Handles long file names gracefully
- [ ] Handles special characters in names
- [ ] Error states display correctly
- [ ] Loading states display correctly

## Browser Compatibility

### Supported Browsers
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari (iOS): Latest version
- Chrome Mobile (Android): Latest version

### Known Limitations
- Requires JavaScript enabled
- Requires modern CSS support (Grid, Flexbox)
- Custom scrollbar styling (Webkit only)

## Design Rationale

### Why This Design?

**Collapsible by Default**
- Reduces visual clutter when not needed
- Users can focus on query input
- Still shows selection status when collapsed

**Clear Visual Hierarchy**
- Header with title and toggle
- Selection summary
- Action buttons
- Document list
- Helper tip

**Progressive Disclosure**
- Basic state (collapsed) shows minimum info
- Expanded state reveals full functionality
- Doesn't overwhelm new users

**Familiar Patterns**
- Checkboxes for multi-select (standard pattern)
- Search bar for filtering (expected behavior)
- Select All / Clear buttons (common operations)

**Visual Feedback**
- Multiple indicators of selection state
- Color coding for different states
- Icons for quick recognition

## Implementation Files

### New Files Created
1. `app/components/DocumentSelector.tsx` (282 lines)
   - Main component implementation
   - TypeScript interfaces
   - State management
   - UI rendering

### Modified Files
1. `app/dashboard/page.tsx`
   - Import DocumentSelector
   - Add selectedDocuments state
   - Integrate component into UI
   - Pass selection to API

2. `app/api/query/route.ts`
   - Accept selectedDocuments parameter
   - Pass to hybridSearch function

3. `lib/db.ts`
   - Update hybridSearch function signature
   - Add document filtering logic
   - Handle optional parameter

## Conclusion

The Document Context Selection UI provides users with granular control over which documents are used as context for AI queries. The design prioritizes usability, accessibility, and visual clarity while maintaining consistency with the existing StudyEZ design system.

The implementation follows best practices for React components, TypeScript type safety, and responsive design. The feature integrates seamlessly with the existing RAG pipeline, allowing for more precise and relevant query results.

---

**Document Version**: 1.0  
**Last Updated**: January 15, 2026  
**Author**: GitHub Copilot  
**Status**: Implemented
