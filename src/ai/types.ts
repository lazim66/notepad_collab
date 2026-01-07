// Types for AI patch operations (matching backend Zod schema)

export interface PatchOp {
  type: 'replace_block' | 'insert_after_block' | 'insert_before_block' | 'delete_block';
  targetId: string;
  html: string | null;
}

export interface PatchPlan {
  summary: string;
  ops: PatchOp[];
  warnings: string[] | null;
}

export interface DocBlock {
  id: string;
  type: string;
  textPreview: string;
  index: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
