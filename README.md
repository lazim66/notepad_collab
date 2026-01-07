# Y-js Collaborative Notepad

A real-time collaborative rich-text editor built with React, TipTap, and Yjs. Multiple users can edit the same document simultaneously with live cursors, presence indicators, and full revision history with time-travel preview.

## ✨ Features

- **Real-time Collaboration**: Multiple users can edit simultaneously with instant synchronization.
- **Rich Text Editing**: Bold, italic, strikethrough, lists, code blocks, and more.
- **User Presence**: See who's online with colored avatars and remote cursors.
- **Offline Support**: Client-side persistence with IndexedDB - your work is saved locally.
- **Version History**: Complete edit timeline with time-travel preview.
- **Export Options**: Download your document as plain text, Markdown, or Yjs update blob.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### AI setup (optional)
- Create `.env.local` and set `OPENAI_API_KEY` to enable the AI assistant (used by `npm run ai-server`).

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd notepad_collab
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:

**Option A: Run everything at once (Recommended)**
```bash
npm run dev:all
```

**Option B: Run services separately**
Open two terminal windows:
```bash
# Terminal 1: Start the WebSocket server
npm run server

# Terminal 2: Start the React dev server
npm run dev

# Terminal 3: Start the AI server
npm run ai-server
```

4. Open multiple browser windows/tabs to `http://localhost:5173` to test collaboration.

## 🏗️ Project Structure

```
src/
├── collab/
│   ├── identity.ts              # Stable user name/color generation
│   └── createCollabSession.ts   # Y.Doc + WebSocket + IndexedDB setup
├── editor/
│   ├── CollaborativeEditor.tsx  # Main TipTap editor component
│   └── ReadOnlyEditor.tsx       # Read-only editor for history preview
├── history/
│   ├── historyLog.ts            # Debounced update tracking
│   ├── rebuildDoc.ts            # Document reconstruction
│   └── HistoryPanel.tsx         # Timeline slider + preview UI
├── export/
│   ├── export.ts                # Export logic (text/JSON/Yjs)
│   └── ExportMenu.tsx           # Export menu component
└── App.tsx                      # Main app integration
```

## 🛠️ Technical Decisions

### Architecture
**CRDT-based Collaboration**: Uses **Yjs** CRDTs (Conflict-free Replicated Data Types) for automatic conflict resolution. This allows true peer-to-peer collaboration without complex operational transform logic or central coordination for conflict resolution.

### Technology Choices

**Editor Engine: TipTap v3**
- We chose TipTap (headless wrapper around ProseMirror) for its excellent React integration and modular architecture.
- **Extensions**: Uses `@tiptap/extension-collaboration` for Yjs binding and `@tiptap/extension-collaboration-cursor` for presence.
- **History**: The default TipTap history extension is disabled in favor of Yjs's native undo/redo manager to ensure undo operations respect per-user changes (local undo doesn't revert remote changes).

**Synchronization: y-websocket**
- A lightweight WebSocket provider distributes document updates and awareness (presence) information.
- The server is currently stateless (just relaying updates), but can be extended for server-side persistence.

**Persistence: y-indexeddb**
- Client-side persistence ensures data durability even if the tab is closed or the browser crashes.
- Updates are saved incrementally to IndexedDB, allowing for fast load times even with large documents.

**History System: Append-only Log**
- Instead of storing full snapshots for every version, we store an append-only log of Yjs binary updates.
- **Debouncing**: To avoid noise, updates are buffered and committed only after a pause in typing (1s) or a max timeout (5s).
- **Time Travel**: To preview past versions, we reconstruct a *separate* temporary `Y.Doc` by applying updates up to the target revision. This is rendered in a read-only editor, ensuring the live document remains unaffected.
- **No Restore**: Decided not to impelment this for this project, because "resetting" a CRDT document safely requires complex logic (atomic transactions, removing all content, re-inserting) that can destabilize concurrent sessions.

## 🧪 Testing Checklist

- [x] **Collaboration**: Verify real-time updates across browsers.
- [x] **Presence**: Confirm multiple users appear with unique names, colors, and remote carets.
- [x] **Persistence**: Refresh page to ensure content restores from IndexedDB.
- [x] **History**: Use slider to time-travel; verify preview is accurate and read-only.
- [x] **Export**: Test Plain Text, Markdown, and Yjs exports.


### With More Time

**1. Server-side Persistence**
- Integrate `y-redis` or `y-websocket` with LevelDB
- Store documents in PostgreSQL or S3 for durability
- Enable multi-device synchronization

**2. Restore Revision Feature**
- Implement atomic "reset" operations
- Add version naming and tagging
- Show visual diffs between versions
- Add temporary document lock during restore

**3. Multi-document Support**
- Add document routing (different URLs = different rooms)
- Document list/dashboard
- Document deletion and archiving

**4. Authentication & Permissions**
- User authentication (OAuth, JWT)
- Per-document access control
- Read-only vs. read-write permissions

**5. Enhanced UX**
- Comments and annotations
- Inline image support
- Table support
- Dark mode toggle

**6. Performance Optimizations**
- Lazy-load history entries
- Persist history log in IndexedDB
- Virtual scrolling for large documents
- Debounce awareness updates

