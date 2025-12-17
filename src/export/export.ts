import * as Y from 'yjs';
import type { Editor } from '@tiptap/react';

export function exportAsPlainText(editor: Editor | null): string {
  if (!editor) return '';
  return editor.getText();
}

export function exportAsMarkdown(editor: Editor | null): string {
  if (!editor) return '';
  
  try {
    // Attempt to use Tiptap's markdown extension serializer
    return editor.storage.markdown.getMarkdown();
  } catch {
    console.warn('Markdown extension not available, falling back to text');
    return editor.getText();
  }
}

export function exportMarkdownToFile(editor: Editor | null, filename = 'document.md'): void {
  const content = exportAsMarkdown(editor);
  downloadFile(content, filename, 'text/markdown');
}


export function exportAsYjsUpdate(ydoc: Y.Doc): string {
  const update = Y.encodeStateAsUpdate(ydoc);
  return btoa(String.fromCharCode(...update));
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPlainTextToFile(editor: Editor | null, filename = 'document.txt'): void {
  const content = exportAsPlainText(editor);
  downloadFile(content, filename, 'text/plain');
}

export function exportYjsUpdateToFile(ydoc: Y.Doc, filename = 'document.yjs'): void {
  const content = exportAsYjsUpdate(ydoc);
  downloadFile(content, filename, 'application/octet-stream');
}
