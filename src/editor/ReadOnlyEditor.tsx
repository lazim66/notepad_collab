import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { Markdown } from 'tiptap-markdown';
import type * as Y from 'yjs';
import './CollaborativeEditor.css'; // Reuse styles

interface ReadOnlyEditorProps {
  doc: Y.Doc;
}

export function ReadOnlyEditor({ doc }: ReadOnlyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-expect-error History is a valid option but types might be mismatching
        history: false,
      }),
      Collaboration.configure({
        document: doc,
      }),
      Markdown,
    ],
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) {
    return <div className="editor-loading">Loading preview...</div>;
  }

  return (
    <div className="collaborative-editor read-only">
      <div className="editor-toolbar read-only-banner">
        <strong>Preview Mode</strong> (Read Only)
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}


