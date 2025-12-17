import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { getOrCreateUserIdentity } from './identity';

export interface CollabSession {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  awareness: WebsocketProvider['awareness'];
  persistence: IndexeddbPersistence;
  undoManager: Y.UndoManager;
  destroy: () => void;
}

export interface CollabSessionOptions {
  wsUrl?: string;
  roomName?: string;
}

const DEFAULT_WS_URL = 'ws://localhost:1234';
const DEFAULT_ROOM_NAME = 'collab-notepad';

export function createCollabSession(
  options: CollabSessionOptions = {}
): CollabSession {
  const { wsUrl = DEFAULT_WS_URL, roomName = DEFAULT_ROOM_NAME } = options;

  const userIdentity = getOrCreateUserIdentity();

  const ydoc = new Y.Doc();

  const provider = new WebsocketProvider(wsUrl, roomName, ydoc);

  provider.awareness.setLocalStateField('user', {
    name: userIdentity.name,
    color: userIdentity.color,
    clientId: userIdentity.clientId,
  });

  const persistence = new IndexeddbPersistence(roomName, ydoc);

  const undoManager = new Y.UndoManager(ydoc.getXmlFragment('default'), {
    captureTimeout: 0, // Capture every keystroke individually
    trackedOrigins: new Set([null]), // Track local changes (origin null)
  });

  persistence.on('synced', () => {
    console.log('Local content loaded from IndexedDB');
  });

  // Ensure we attempt to clean up on page unload, though reliability varies by browser
  if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
          provider.awareness.setLocalState(null);
      });
  }

  const destroy = () => {
    // Clean up awareness to avoid "ghost" users on reload
    provider.awareness.setLocalState(null);
    
    provider.disconnect();
    provider.destroy();
    ydoc.destroy();
    persistence.destroy();
    undoManager.destroy();
  };

  return {
    ydoc,
    provider,
    awareness: provider.awareness,
    persistence,
    undoManager,
    destroy,
  };
}
