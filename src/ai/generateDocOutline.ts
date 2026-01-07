import type { Editor } from '@tiptap/react';
import type { DocBlock } from './types';

const MAX_PREVIEW_LENGTH = 80;

/**
 * Generates a document outline from the editor's current state.
 * Extracts block-level nodes with their IDs, types, and text previews.
 */
export function generateDocOutline(editor: Editor): DocBlock[] {
  const outline: DocBlock[] = [];
  const doc = editor.state.doc;

  let blockIndex = 0;

  doc.descendants((node, pos) => {
    // Only process top-level block nodes
    if (node.isBlock && pos > 0) {
      const id = node.attrs.id as string | undefined;

      if (id) {
        // Extract text content
        let textContent = '';
        node.descendants((child) => {
          if (child.isText) {
            textContent += child.text;
          }
        });

        const textPreview =
          textContent.length > MAX_PREVIEW_LENGTH
            ? textContent.substring(0, MAX_PREVIEW_LENGTH) + '...'
            : textContent;

        outline.push({
          id,
          type: node.type.name,
          textPreview: textPreview.trim() || '(empty)',
          index: blockIndex++,
        });
      }
    }

    // Continue traversing only top-level blocks (don't descend into nested structures)
    return node.type.name === 'doc';
  });

  return outline;
}
