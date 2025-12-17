import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { createCollabSession, type CollabSession } from './collab/createCollabSession';
import { createHistoryLog, type HistoryLog } from './history/historyLog';
import { CollaborativeEditor } from './editor/CollaborativeEditor';
import { ReadOnlyEditor } from './editor/ReadOnlyEditor';
import { HistoryPanel } from './history/HistoryPanel';
import { ExportMenu } from './export/ExportMenu';
import './App.css';

function App() {
  const [session, setSession] = useState<CollabSession | null>(null);
  const [historyLog, setHistoryLog] = useState<HistoryLog | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Y.Doc | null>(null);

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

        <aside className="history-sidebar">
          <HistoryPanel historyLog={historyLog} onPreviewChange={setPreviewDoc} />
        </aside>
      </div>
    </div>
  );
}

export default App;
