import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { CollabSession } from '../collab/createCollabSession';
import { exportPlainTextToFile, exportMarkdownToFile, exportYjsUpdateToFile } from './export';
import './ExportMenu.css';

interface ExportMenuProps {
  editor: Editor | null;
  session: CollabSession;
}

export function ExportMenu({ editor, session }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportPlainText = () => {
    exportPlainTextToFile(editor);
    setIsOpen(false);
  };

  const handleExportMarkdown = () => {
    exportMarkdownToFile(editor);
    setIsOpen(false);
  };

  const handleExportYjs = () => {
    exportYjsUpdateToFile(session.ydoc);
    setIsOpen(false);
  };

  return (
    <div className="export-menu">
      <button
        type="button"
        className="export-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        📥 Export Document
      </button>

      {isOpen && (
        <>
          <div className="export-backdrop" onClick={() => setIsOpen(false)} />
          <div className="export-dropdown">
            <button
              type="button"
              className="export-option"
              onClick={handleExportPlainText}
            >
              <div className="option-icon">📄</div>
              <div className="option-details">
                <div className="option-title">Plain Text</div>
                <div className="option-description">Export as .txt file</div>
              </div>
            </button>

            <button
              type="button"
              className="export-option"
              onClick={handleExportMarkdown}
            >
              <div className="option-icon">📝</div>
              <div className="option-details">
                <div className="option-title">Markdown</div>
                <div className="option-description">Export as .md file</div>
              </div>
            </button>

            <button
              type="button"
              className="export-option"
              onClick={handleExportYjs}
            >
              <div className="option-icon">🔄</div>
              <div className="option-details">
                <div className="option-title">Yjs Update Blob</div>
                <div className="option-description">Export as base64-encoded Yjs update</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
