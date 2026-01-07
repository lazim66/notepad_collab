import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { createCollabSession, type CollabSession } from './collab/createCollabSession';
import { createHistoryLog, type HistoryLog } from './history/historyLog';
import { CollaborativeEditor } from './editor/CollaborativeEditor';
import { ReadOnlyEditor } from './editor/ReadOnlyEditor';
import { AiChatPanel } from './ai/AiChatPanel';
import { HistoryPanel } from './history/HistoryPanel';
import { ExportMenu } from './export/ExportMenu';
import './App.css';

type SidebarType = 'ai' | 'history';

function App() {
  const [session, setSession] = useState<CollabSession | null>(null);
  const [historyLog, setHistoryLog] = useState<HistoryLog | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Y.Doc | null>(null);
  const [sidebarType, setSidebarType] = useState<SidebarType>('ai');

  useEffect(() => {
    const collabSession = createCollabSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialization on mount
    setSession(collabSession);

    const history = createHistoryLog(collabSession.ydoc);

    setHistoryLog(history);

    return () => {
      collabSession.destroy();
    };
  }, []);

  if (!session || !historyLog) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing collaborative session...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>📝 Collaborative Notepad</h1>
          <p className="header-subtitle">Real-time collaborative text editor powered by Yjs</p>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="sidebar-toggle-button"
            onClick={() => setSidebarType(sidebarType === 'ai' ? 'history' : 'ai')}
            title={sidebarType === 'ai' ? 'Show History Panel' : 'Show AI Panel'}
          >
            {sidebarType === 'ai' ? '🕰️ History' : '🤖 AI'}
          </button>
          <ExportMenu editor={editor} session={session} />
        </div>
      </header>

      <div className="app-container">
        <main className="main-content">
          {previewDoc ? (
            <ReadOnlyEditor key={previewDoc.clientID} doc={previewDoc} />
          ) : (
            <CollaborativeEditor
              session={session}
              onEditorChange={setEditor}
            />
          )}
        </main>

        <aside className="ai-sidebar">
          {sidebarType === 'ai' ? (
            <AiChatPanel editor={editor} isReadOnly={!!previewDoc} />
          ) : (
            <HistoryPanel historyLog={historyLog} onPreviewChange={setPreviewDoc} />
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
