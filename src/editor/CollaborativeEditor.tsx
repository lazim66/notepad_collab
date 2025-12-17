import { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import type { CollabSession } from '../collab/createCollabSession';
import { getOrCreateUserIdentity } from '../collab/identity';
import './CollaborativeEditor.css';

interface CollaborativeEditorProps {
  session: CollabSession;
  onEditorChange?: (editor: Editor | null) => void;
}

export function CollaborativeEditor({ session, onEditorChange }: CollaborativeEditorProps) {
  const [userIdentity] = useState(() => getOrCreateUserIdentity());
  const [status, setStatus] = useState(session.provider.wsconnected ? 'connected' : 'connecting');
  const [userCount, setUserCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default History extension so Collaboration extension can handle it
        // @ts-expect-error History is a valid option but types might be mismatching
        history: false,
      }),
      Collaboration.configure({
        document: session.ydoc,
      }),
      CollaborationCaret.configure({
        provider: session.provider,
        user: {
          name: userIdentity.name,
          color: userIdentity.color,
          clientId: userIdentity.clientId,
        },
      }),
      Placeholder.configure({
        placeholder: 'Write something amazing...',
      }),
      Markdown.configure({
        html: true,
        transformCopiedText: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    immediatelyRender: false,
  });

  // Track connection status
  useEffect(() => {
    const handleStatus = (event: { status: string }) => {
      setStatus(event.status);
    };

    session.provider.on('status', handleStatus);
    return () => {
      session.provider.off('status', handleStatus);
    };
  }, [session.provider]);

  // Track awareness changes for user count with de-duplication
  useEffect(() => {
    const updateCount = () => {
      const states = session.awareness.getStates();
      // Use a Set to store unique clientIds to handle "ghost" users on refresh
      // A user might be present twice (old session ID + new session ID) but their clientId string is the same
      const uniqueUsers = new Set<string>();

      states.forEach((state) => {
        // Check for state.user.clientId which we set in identity.ts
        if (state.user && state.user.clientId) {
          uniqueUsers.add(state.user.clientId);
        }
      });
      setUserCount(uniqueUsers.size);
    };

    updateCount();
    session.awareness.on('change', updateCount);
    return () => {
      session.awareness.off('change', updateCount);
    };
  }, [session.awareness]);

  // Track undo/redo state (for keyboard shortcuts)
  useEffect(() => {
    // Add keyboard listener manually to ensure it bypasses Tiptap
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        session.undoManager.undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        session.undoManager.redo();
      }
    };

    // Attach to window to catch everything when editor is focused
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [session.undoManager]);

  // Sync user identity to editor
  useEffect(() => {
    if (editor && userIdentity) {
      editor.chain().focus().updateUser({
        name: userIdentity.name,
        color: userIdentity.color,
        clientId: userIdentity.clientId, // Include ID for uniqueness
      }).run();
    }
  }, [editor, userIdentity]);

  // Propagate editor instance
  useEffect(() => {
    if (onEditorChange) {
      onEditorChange(editor ?? null);
    }
    return () => {
      onEditorChange?.(null);
    };
  }, [editor, onEditorChange]);

  const handleFormat = useCallback((command: () => boolean) => {
    command();
    editor?.commands.focus();
  }, [editor]);

  if (!editor) {
    return <div className="editor-loading">Loading editor...</div>;
  }

  return (
    <div className="collaborative-editor">
      <div className="editor-toolbar">
        <div className="button-group">
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleBold().run())}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold"
          >
            Bold
          </button>
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleItalic().run())}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic"
          >
            Italic
          </button>
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleStrike().run())}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title="Strike"
          >
            Strike
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="button-group">
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            title="H1"
          >
            H1
          </button>
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            title="H2"
          >
            H2
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="button-group">
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleBulletList().run())}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
          >
            Bullet List
          </button>
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleOrderedList().run())}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Ordered List"
          >
            Ordered List
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="button-group">
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleCodeBlock().run())}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            title="Code Block"
          >
            Code
          </button>
          <button
            onClick={() => handleFormat(() => editor.chain().focus().toggleBlockquote().run())}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Quote"
          >
            Quote
          </button>
        </div>
      </div>

      <EditorContent editor={editor} className="editor-content" />

      <div className="collab-status-group" data-state={status === 'connected' ? 'online' : 'offline'}>
        <label>
          {status === 'connected'
            ? `${userCount} user${userCount === 1 ? '' : 's'} online`
            : 'Offline'}
        </label>
        <button style={{ color: userIdentity.color }}>
          {userIdentity.name}
        </button>
      </div>
    </div>
  );
}
