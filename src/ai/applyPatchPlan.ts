import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PatchPlan, PatchOp } from './types';

interface BlockLocation {
  node: ProseMirrorNode;
  pos: number;
}

/**
 * Finds a block by its unique ID in the editor's document.
 * Returns the node and its position.
 */
function findBlockById(editor: Editor, id: string): BlockLocation | null {
  const doc = editor.state.doc;
  let result: BlockLocation | null = null;
  let foundCount = 0;

  doc.descendants((node, pos) => {
    if (node.attrs.id === id) {
      result = { node, pos };
      foundCount++;
    }
  });

  // Safety check: ensure ID is unique
  if (foundCount > 1) {
    console.error(`[PatchApply] Found ${foundCount} blocks with id="${id}" (expected 1)`);
    return null;
  }

  return result;
}

/**
 * Computes the range (from, to) for a block node.
 */
function blockRange(pos: number, node: ProseMirrorNode): { from: number; to: number } {
  return {
    from: pos,
    to: pos + node.nodeSize,
  };
}

/**
 * Validates that operations don't reference deleted/replaced blocks.
 */
function validateOpsOrdering(ops: PatchOp[]): string | null {
  const deletedIds = new Set<string>();

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const targetId = op.targetId;

    // Check if this op references a deleted block
    if (deletedIds.has(targetId)) {
      return `Operation ${i} references block "${targetId}" which was deleted/replaced by a previous operation`;
    }

    // Track deletions/replacements
    if (op.type === 'delete_block' || op.type === 'replace_block') {
      deletedIds.add(targetId);
    }
  }

  return null;
}

/**
 * Applies a single patch operation to the editor.
 * Returns true on success, false on failure.
 */
function applyOperation(editor: Editor, op: PatchOp, opIndex: number): boolean {
  try {
    const location = findBlockById(editor, op.targetId);

    if (!location) {
      console.error(`[PatchApply] Operation ${opIndex}: Block with id="${op.targetId}" not found`);
      return false;
    }

    const range = blockRange(location.pos, location.node);

    switch (op.type) {
      case 'replace_block': {
        if (!op.html) {
          console.error(`[PatchApply] replace_block requires html content`);
          return false;
        }
        // Replace the entire block with new HTML
        editor.commands.insertContentAt(range, op.html, {
          errorOnInvalidContent: true,
        });
        console.log(`[PatchApply] Replaced block "${op.targetId}"`);
        return true;
      }

      case 'delete_block': {
        // Delete the block
        editor.commands.deleteRange(range);
        console.log(`[PatchApply] Deleted block "${op.targetId}"`);
        return true;
      }

      case 'insert_after_block': {
        if (!op.html) {
          console.error(`[PatchApply] insert_after_block requires html content`);
          return false;
        }
        // Insert content after the block
        const insertPos = range.to;
        editor.commands.insertContentAt(insertPos, op.html, {
          errorOnInvalidContent: true,
        });
        console.log(`[PatchApply] Inserted content after block "${op.targetId}"`);
        return true;
      }

      case 'insert_before_block': {
        if (!op.html) {
          console.error(`[PatchApply] insert_before_block requires html content`);
          return false;
        }
        // Insert content before the block
        const insertPos = range.from;
        editor.commands.insertContentAt(insertPos, op.html, {
          errorOnInvalidContent: true,
        });
        console.log(`[PatchApply] Inserted content before block "${op.targetId}"`);
        return true;
      }

      default: {
        console.error(`[PatchApply] Unknown operation type:`, op);
        return false;
      }
    }
  } catch (error) {
    console.error(`[PatchApply] Operation ${opIndex} failed:`, error);
    return false;
  }
}

export interface ApplyPatchResult {
  success: boolean;
  appliedOps: number;
  totalOps: number;
  error?: string;
  beforeJson?: object;
  afterJson?: object;
}

/**
 * Applies a PatchPlan to the editor.
 * Stops on first error and returns result.
 */
export function applyPatchPlan(editor: Editor, patchPlan: PatchPlan): ApplyPatchResult {
  console.log(`[PatchApply] Applying patch: "${patchPlan.summary}"`);
  console.log(`[PatchApply] ${patchPlan.ops.length} operations to apply`);

  if (patchPlan.warnings && patchPlan.warnings.length > 0) {
    console.warn('[PatchApply] Warnings:', patchPlan.warnings);
  }

  // Validate operation ordering
  const orderingError = validateOpsOrdering(patchPlan.ops);
  if (orderingError) {
    return {
      success: false,
      appliedOps: 0,
      totalOps: patchPlan.ops.length,
      error: orderingError,
    };
  }

  // Capture before state
  const beforeJson = editor.getJSON();

  // Apply operations sequentially
  let appliedCount = 0;
  for (let i = 0; i < patchPlan.ops.length; i++) {
    const op = patchPlan.ops[i];
    const success = applyOperation(editor, op, i);

    if (!success) {
      return {
        success: false,
        appliedOps: appliedCount,
        totalOps: patchPlan.ops.length,
        error: `Failed to apply operation ${i} (${op.type} on "${op.targetId}")`,
        beforeJson,
      };
    }

    appliedCount++;
  }

  // Capture after state
  const afterJson = editor.getJSON();

  console.log(`[PatchApply] Successfully applied all ${appliedCount} operations`);

  return {
    success: true,
    appliedOps: appliedCount,
    totalOps: patchPlan.ops.length,
    beforeJson,
    afterJson,
  };
}
