# Curriculum Extraction Inspector - Implementation Plan

## Overview

Based on the wireframe, this is an **internal QA/Debug tool** to inspect each stage of the curriculum extraction pipeline. The tool allows:
1. **Upload** a curriculum document (PDF, DOCX, PPT, XLS)
2. **Select** a year group
3. **Choose** which inspection stages to view (Classification, Year Filtering, Extraction)
4. **Run** the inspection and view results in a tabbed interface

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Curriculum Extraction Inspector                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ INPUT PANEL                                                             ││
│  │ • File Upload (PDF, DOCX, etc)                                          ││
│  │ • Year Group Select                                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ INSPECTION OPTIONS                                                      ││
│  │ ☑ Document Classification                                               ││
│  │ ☑ Year Filtering                                                        ││
│  │ ☑ Extraction                                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    [ Run Inspection ]                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ RESULTS                                                                 ││
│  │ [ Classification ] [ Year Filtering ] [ Extraction ]  ← Tabs            ││
│  │ ┌───────────────────────────────────────────────────────────────────┐   ││
│  │ │ Input: ...                                                        │   ││
│  │ │ Output: { ... }                                       [Copy]      │   ││
│  │ └───────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure (New & Modified)

```
src/
├── app/
│   └── curriculum/                          # NEW: Route for curriculum inspector
│       └── page.tsx                         # Main inspector page
├── components/
│   ├── app-sidebar.tsx                      # UPDATE: Add Curriculum Extraction nav item
│   └── curriculum/                          # NEW: Curriculum-specific components
│       ├── input-panel.tsx                  # File upload + year selector
│       ├── inspection-options.tsx           # Checkboxes for inspection stages
│       └── results-panel.tsx                # Tabbed results display
└── lib/
    └── curriculum-api.ts                    # NEW: Dummy API for curriculum inspection
```

---

## Step 1: Define Types & Dummy API (`src/lib/curriculum-api.ts`)

**Types based on wireframe:**

```typescript
// Request
interface InspectionRequest {
  file: File;
  yearGroup: string;
  options: {
    showClassification: boolean;
    showYearFiltering: boolean;
    showExtraction: boolean;
  };
}

// Response
interface InspectionResponse {
  classification?: {
    input: string;           // First 500 chars sent to classifier
    output: {
      document_type: string; // e.g., "half_term", "yearly", "lesson_week"
      confidence: number;    // 0-1
    };
  };
  yearFiltering?: {
    inputChunks: string[];   // Chunks before filtering
    filteredOutput: string;  // Content after filtering for selected year
  };
  extraction?: {
    prompt: string;          // Prompt sent to LLM
    output: {
      learning_objectives: Array<{
        title: string;
        week: number;
        subject?: string;
      }>;
    };
  };
}
```

**Dummy API Implementation:**
- Simulate 2-3 second processing delay
- Return realistic dummy data based on the wireframe examples
- Accept file upload via FormData

---

## Step 2: Add Sidebar Navigation (`src/components/app-sidebar.tsx`)

Add new top-level navigation item:

```typescript
{
  title: "Curriculum Extraction",
  url: "/curriculum",
  icon: IconFileSearch, // or similar
}
```

Position: After "System Prompts", before Settings.

---

## Step 3: Create Input Panel Component (`src/components/curriculum/input-panel.tsx`)

**Features:**
- File input accepting: `.pdf, .docx, .pptx, .xlsx`
- Year group dropdown (Year 1 through Year 6, or configurable)
- Validation: file required, year required
- Display selected file name

**Uses:** Card, Input (file), Select, Label

---

## Step 4: Create Inspection Options Component (`src/components/curriculum/inspection-options.tsx`)

**Features:**
- 3 checkboxes with descriptions:
  1. **Document Classification**
     - Show input text sent for classification
     - Show classification output & confidence
  2. **Year Filtering**
     - Show chunks before filtering
     - Show content after filtering for selected year
  3. **Extraction**
     - Show prompt sent to LLM
     - Show raw extraction output
- At least one option must be selected

**Uses:** Card, Checkbox, Label

---

## Step 5: Create Results Panel Component (`src/components/curriculum/results-panel.tsx`)

**Features:**
- Tabbed interface (only show tabs for enabled options)
- Each tab has:
  - **Input section** (code-like, monospace)
  - **Output section** (JSON, copyable)
  - **Copy button** for output
- Empty state: "No inspection has been run yet"
- Error state: "Processing failed" with error message

**Tab Contents:**

| Tab | Input Label | Output Label |
|-----|-------------|--------------|
| Classification | "Input to Classifier" | "Output" (JSON) |
| Year Filtering | "Input Chunks" | "Filtered Output (Year X)" |
| Extraction | "Prompt Sent to LLM" | "Raw Extraction Output" (JSON) |

**Uses:** Tabs, TabsList, TabsTrigger, TabsContent, Card, Button, toast

---

## Step 6: Create Main Page (`src/app/curriculum/page.tsx`)

**Features:**
- Page title: "Curriculum Extraction Inspector" with subtitle "(Internal QA / Debug Tool)"
- Layout: Vertical stack with clear sections
- State management:
  - `file: File | null`
  - `yearGroup: string`
  - `options: { classification, yearFiltering, extraction }`
  - `results: InspectionResponse | null`
  - `loading: boolean`
  - `error: string | null`
- "Run Inspection" button with loading state ("Processing...")
- Validation before submission

**Uses:** SiteHeader, Card components, all custom components above

---

## Step 7: Add Checkbox Component (`src/components/ui/checkbox.tsx`)

Create a checkbox component using Radix UI (following existing patterns).

---

## Dummy Data Examples

**Classification Output:**
```json
{
  "document_type": "half_term",
  "confidence": 0.92
}
```

**Year Filtering:**
```
Input Chunks:
- Chunk 1: "Autumn Term – Year 2: Students will learn..."
- Chunk 2: "Spring Term – Year 3: Focus on multiplication..."
- Chunk 3: "Summer Term – Year 3: Geography and history..."

Filtered Output (Year 3):
"Spring Term – Year 3: Focus on multiplication...
Summer Term – Year 3: Geography and history..."
```

**Extraction Output:**
```json
{
  "learning_objectives": [
    { "title": "Understand place value up to 1000", "week": 1, "subject": "Maths" },
    { "title": "Write narrative stories with clear structure", "week": 2, "subject": "English" },
    { "title": "Identify properties of 2D and 3D shapes", "week": 3, "subject": "Maths" },
    { "title": "Explore habitats and living things", "week": 4, "subject": "Science" }
  ]
}
```

---

## Implementation Order

| # | Task | Files | Status |
|---|------|-------|--------|
| 1 | Create Checkbox UI component | `src/components/ui/checkbox.tsx` | ⬜ |
| 2 | Create curriculum API with types & dummy data | `src/lib/curriculum-api.ts` | ⬜ |
| 3 | Create Input Panel component | `src/components/curriculum/input-panel.tsx` | ⬜ |
| 4 | Create Inspection Options component | `src/components/curriculum/inspection-options.tsx` | ⬜ |
| 5 | Create Results Panel component | `src/components/curriculum/results-panel.tsx` | ⬜ |
| 6 | Create main Curriculum page | `src/app/curriculum/page.tsx` | ⬜ |
| 7 | Update sidebar navigation | `src/components/app-sidebar.tsx` | ⬜ |
| 8 | Test and verify build | - | ⬜ |

---

## API Contract (for future backend integration)

When the real API is ready, we'll update `curriculum-api.ts`:

**Endpoint:** `POST /curriculum/inspect`

**Request:** `multipart/form-data`
```
file: File
year_group: string (e.g., "Year 3")
show_classification: boolean
show_year_filtering: boolean
show_extraction: boolean
```

**Response:** Same as `InspectionResponse` type

---

## What's NOT in MVP (per wireframe)

- Execution timeline (Uploaded → Classified → Filtered → Extracted)
- Metadata strip (Doc Type | Model | Time Taken)
- Toggle between Pretty JSON / Raw JSON

---

## UX Principles (from wireframe)

- **Debug-first:** clear Input vs Output separation
- **Pipeline visibility:** mirrors backend stages (Classification → Year Filter → Extraction)
- **Low visual noise:** neutral colors, minimal decoration
- **Copy-friendly:** every output block should support easy copying
