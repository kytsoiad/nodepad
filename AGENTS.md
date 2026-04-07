# AGENTS.md — nodepad

This document provides essential context for AI coding agents working on the nodepad project.

---

## Project Overview

**nodepad** is a spatial, AI-augmented thinking tool built as a single-page Next.js application. Unlike chat-based AI tools, it treats thinking as spatial and associative — users add notes to a canvas, and AI works quietly in the background to classify, connect, and synthesize ideas.

**Key Design Philosophy:**
- AI classifies notes into 14 content types automatically
- AI finds connections between notes and surfaces emergent insights
- Three spatial views: **tiling** (BSP grid), **kanban** (grouped by type), **graph** (force-directed)
- "Ghost notes" — AI-generated synthesis suggestions that appear after accumulating enough diverse notes
- All data stays local — no server, no database, no accounts

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.2 (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5.7.3 |
| Styling | Tailwind CSS 4.2.0 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Animation | Framer Motion |
| Graph Viz | D3.js |
| AI Provider | OpenRouter (default) or OpenAI |
| Icons | Lucide React |

---

## Project Structure

```
nodepad/
├── app/                          # Next.js App Router
│   ├── api/fetch-url/route.ts    # URL metadata fetcher (CORS proxy)
│   ├── globals.css               # Tailwind v4 CSS with custom theming
│   ├── layout.tsx                # Root layout, fonts, metadata
│   ├── page.tsx                  # MAIN APPLICATION (1000+ lines)
│   └── opengraph-image.tsx       # OG image generation
├── components/
│   ├── ui/                       # shadcn components (minimal)
│   ├── tile-card.tsx             # Core note card component
│   ├── tiling-area.tsx           # BSP grid view
│   ├── kanban-area.tsx           # Kanban board view
│   ├── graph-area.tsx            # Force-directed graph view
│   ├── ghost-panel.tsx           # AI synthesis sidebar
│   ├── project-sidebar.tsx       # Settings & project switcher
│   ├── vim-input.tsx             # Command palette input
│   └── ...
├── lib/
│   ├── ai-enrich.ts              # Note classification & annotation API
│   ├── ai-ghost.ts               # Synthesis generation
│   ├── ai-settings.ts            # Model/provider configuration
│   ├── content-types.ts          # 14 content type definitions
│   ├── detect-content-type.ts    # Heuristic type detection
│   ├── nodepad-format.ts         # .nodepad file format
│   ├── export.ts                 # Markdown export
│   ├── utils.ts                  # cn(), useModKey(), getRelatedIds()
│   └── initial-data.ts           # Default project
├── next.config.mjs               # Security headers, build config
├── proxy.ts                      # Rate limiting middleware
├── postcss.config.mjs            # Tailwind v4 PostCSS
└── components.json               # shadcn configuration
```

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint with ESLint
npm run lint
```

**Important Build Notes:**
- TypeScript errors are intentionally ignored in production builds (`ignoreBuildErrors: true` in `next.config.mjs`)
- Images are unoptimized (`unoptimized: true`)
- Static export compatible

---

## Core Data Model

### TextBlock (Note)
```typescript
interface TextBlock {
  id: string
  text: string
  timestamp: number
  contentType: ContentType          // 14 possible types
  category?: string                 // AI-assigned topic tag
  annotation?: string               // AI-generated insight
  confidence?: number | null        // 0-100 for claims
  influencedBy?: string[]           // Block IDs this relates to
  isPinned?: boolean
  isUnrelated?: boolean
  sources?: { url, title, siteName }[]
  subTasks?: SubTask[]              // For task type
  isEnriching?: boolean             // Loading state
  isError?: boolean
}
```

### Project
```typescript
interface Project {
  id: string
  name: string
  blocks: TextBlock[]
  collapsedIds: string[]
  ghostNotes: GhostNote[]
  lastGhostBlockCount?: number      // Tracks when to generate new ghosts
  lastGhostTimestamp?: number
  lastGhostTexts?: string[]         // Deduplication
}
```

### Content Types (14 total)
`entity`, `claim`, `question`, `task`, `idea`, `reference`, `quote`, `definition`, `opinion`, `reflection`, `narrative`, `comparison`, `thesis`, `general`

Each has: icon, accent color CSS variable, optional body styling.

---

## AI Integration Architecture

**Two-stage AI pipeline (client-side only):**

1. **Enrichment** (`lib/ai-enrich.ts`)
   - Called when a note is added or edited
   - Sends note + context (last 15 notes) to LLM
   - Returns: `contentType`, `category`, `annotation`, `confidence`, `influencedByIndices`
   - Supports web grounding for truth-dependent types (claim, question, reference, etc.)
   - Response via JSON schema or json_object mode

2. **Ghost Generation** (`lib/ai-ghost.ts`)
   - Triggered automatically after 5+ new enriched blocks
   - Minimum 5 minutes between generations
   - Requires 2+ distinct categories for diversity
   - Finds "unspoken bridge" — cross-category insights
   - Returns: synthesized thesis text + category

**Supported Providers:**
- **OpenRouter** (default): `openai/gpt-4o`, `anthropic/claude-sonnet-4-5`, `google/gemini-2.5-pro`, etc.
- **OpenAI**: Direct API with search-preview models for grounding

**Configuration:**
- API key stored in `localStorage` under `nodepad-ai-settings`
- Model selection, web grounding toggle in Settings panel
- Keys never pass through any server

---

## Persistence & Data Storage

**LocalStorage keys:**
- `nodepad-projects` — Primary project data
- `nodepad-active-project` — Currently selected project ID
- `nodepad-backup` — Silent rolling backup on every change
- `nodepad-intro-seen` — First-time user flag
- `nodepad-ai-settings` — API keys and model preferences

**No backend database.** Everything lives in the browser.

**Import/Export:**
- `.nodepad` files — Versioned JSON with full project state
- `.md` files — Rich Markdown export with TOC, tables, formatting

---

## Key Architectural Patterns

### State Management
- Single source of truth in `app/page.tsx` (main component)
- `useState` for projects, active project, view mode
- `useRef` for stable references to avoid re-renders:
  - `blocksRef` — Current blocks for callbacks
  - `projectsRef` — Current projects for import handlers
  - `blockHistoryRef` — Undo stack (max 20 snapshots per project)

### Debouncing
- Edit debounce: 800ms before re-enrichment
- Cleanup on project switch to prevent stale updates

### Undo System
- `Cmd+Z` (or `Ctrl+Z`) triggers undo
- Pushes snapshot before: add, delete, edit, clear, type change
- Shows toast notification

### Connection Hover Effect
- Hover connection indicator → dims unrelated notes
- Click to lock highlight state
- Clears on Escape or when locked block loses connections

### View Modes
- **Tiling**: BSP (Binary Space Partitioning) tree layout, 7 tiles per "page"
- **Kanban**: Grouped by `contentType`, horizontal scroll per column
- **Graph**: D3 force-directed with centrality-radial positioning

---

## Styling Conventions

**Tailwind v4 with CSS variables:**
- Dark theme only (defined in `:root`)
- Custom color tokens for each content type: `--type-claim`, `--type-question`, etc.
- CSS variables used for dynamic coloring based on note type

**Key patterns:**
```css
/* Content type accent colors */
--type-claim: oklch(0.75 0.15 80);
--type-question: oklch(0.68 0.18 290);
/* etc. */
```

**Component styling:**
- `bg-card/30` — Semi-transparent card backgrounds
- `color-mix(in oklch, ${accent} 35%, transparent)` — Dynamic tints
- Custom scrollbar styling in globals.css
- RTL text support for Arabic/Hebrew

---

## Security Considerations

**Security headers** (in `next.config.mjs`):
- `X-Frame-Options: DENY`
- `Content-Security-Policy` with strict `connect-src` allowlist
- `Referrer-Policy: strict-origin-when-cross-origin`

**API route protections** (`app/api/fetch-url`):
- SSRF protection — blocks private IP ranges, localhost, metadata endpoints
- Rate limiting — 30 requests/min per IP
- Origin validation — same-origin only

**Client-side:**
- API keys stored only in localStorage
- Direct browser-to-provider calls (OpenRouter/OpenAI)
- No server-side key storage

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit note from input |
| `Cmd+K` / `Ctrl+K` | Command palette |
| `Cmd+Z` / `Ctrl+Z` | Undo |
| `Escape` | Deselect / close panels |
| `#type text` | Inline type override (e.g., `#claim The earth is round`) |

---

## Common Development Tasks

### Adding a New Content Type
1. Add to `ContentType` union in `lib/content-types.ts`
2. Add config to `CONTENT_TYPE_CONFIG` (icon, accent color, body style)
3. Add CSS variable in `app/globals.css`
4. Add to `--color-*` exports in `@theme inline`
5. Add type emoji/description in `lib/export.ts` `TYPE_META`

### Modifying AI Prompts
- System prompt: `lib/ai-enrich.ts` → `SYSTEM_PROMPT`
- JSON schema: `lib/ai-enrich.ts` → `JSON_SCHEMA`
- Ghost prompt: `lib/ai-ghost.ts` inline template

### Adding a New View Mode
1. Add to `viewMode` state type in `page.tsx`
2. Create component in `components/[mode]-area.tsx`
3. Add to view switcher in main render
4. Add command in `handleCommand` function

---

## External Dependencies

**Required for development:**
- Node.js 18+
- npm
- OpenRouter API key (for AI features)

**Optional:**
- OpenAI API key (alternative provider)

---

## Testing Strategy

**Current state:** No automated tests. Manual testing checklist:

- Note creation, editing, deletion
- Type classification and reclassification
- View switching (tiling → kanban → graph)
- Project creation, renaming, deletion
- Import/export (.nodepad and .md)
- AI enrichment with different providers
- Ghost note generation
- Undo functionality
- Mobile wall blocking (resize to < 768px)

---

## Deployment

**Static export compatible.** Build outputs to `dist/` (configured in `next.config.mjs`).

**Recommended platforms:**
- Vercel (optimal for Next.js)
- Any static hosting (Netlify, GitHub Pages, etc.)

**Environment variables:** None required. All configuration is client-side via localStorage.

---

## Known Limitations

1. **Mobile**: Intentionally blocked below 768px (`<MobileWall />` component) — desktop-only experience
2. **No multiplayer**: Single-user, local-only
3. **Storage limits**: Subject to browser localStorage quotas (~5-10MB)
4. **No automated tests**: Manual QA only
5. **TypeScript errors ignored**: Build succeeds with type errors

---

## File Watch List

When making changes, be aware these files have wide impact:

- `app/page.tsx` — Main application logic, state management
- `components/tile-card.tsx` — Core UI component used everywhere
- `lib/content-types.ts` — Type system foundation
- `lib/ai-enrich.ts` — AI integration critical path
- `app/globals.css` — Theme variables affect all components

---

*Last updated: 2026-04-07*
*For human-readable documentation, see README.md*
