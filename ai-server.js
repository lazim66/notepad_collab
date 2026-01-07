import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// Load .env.local explicitly
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.AI_SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define PatchOp schema
const PatchOpSchema = z.object({
  type: z.enum(['replace_block', 'insert_after_block', 'insert_before_block', 'delete_block'])
    .describe('Type of operation to perform'),
  targetId: z.string().describe('ID of the block to target'),
  html: z.string().nullable().describe('HTML content for replace/insert operations, null for delete'),
});

// Define PatchPlan schema
const PatchPlanSchema = z.object({
  summary: z.string().describe('Brief human-readable summary of the changes'),
  ops: z.array(PatchOpSchema).describe('Ordered list of operations to apply'),
  warnings: z.array(z.string()).nullable().describe('Optional warnings about the operations, set to null if none'),
});

// System prompt for AI
const SYSTEM_PROMPT = `You are an AI assistant that helps edit rich text documents. You receive a document outline and user instructions, then generate precise edit operations.

ALLOWED HTML TAGS ONLY:
<p>, <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, <strong>, <em>, <s>, <blockquote>, <ul>, <ol>, <li>, <pre>, <code>

FORBIDDEN:
- <script>, <iframe>, <style>, inline event handlers, external embeds
- Do NOT include 'id' or 'data-id' attributes in your HTML (IDs are managed automatically)

RULES:
1. Only reference block IDs that exist in the provided document outline
2. Operations are applied in order - don't reference a block you deleted/replaced earlier
3. Keep HTML clean and simple
4. Match the document's existing style and structure
5. If you can't find an appropriate block to target, explain in warnings

OUTPUT FORMAT:
Generate operations that precisely implement the user's request.`;

// POST /api/ai/patch
app.post('/api/ai/patch', async (req, res) => {
  try {
    const { messages, docOutline, docHtml } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!docOutline || !Array.isArray(docOutline)) {
      return res.status(400).json({ error: 'Document outline is required' });
    }

    // Build context message
    let contextMessage = `DOCUMENT OUTLINE (${docOutline.length} blocks):\n`;
    docOutline.forEach((block, idx) => {
      contextMessage += `[${idx}] id:"${block.id}" type:${block.type} text:"${block.textPreview || ''}"\n`;
    });

    if (docHtml && docHtml.length < 50000) {
      contextMessage += `\n\nFULL DOCUMENT HTML:\n${docHtml}`;
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: contextMessage },
      ...messages,
    ];

    console.log(`[AI] Processing request with ${messages.length} messages, ${docOutline.length} blocks`);

    // Call OpenAI with structured outputs
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4o',
      messages: openaiMessages,
      response_format: zodResponseFormat(PatchPlanSchema, 'patch_plan'),
      temperature: 0.7,
    });

    const patchPlan = completion.choices[0].message.parsed;

    if (!patchPlan) {
      // Retry with repair prompt
      console.log('[AI] Initial parse failed, attempting repair...');
      const repairMessages = [
        ...openaiMessages,
        {
          role: 'system',
          content: 'Your previous response did not match the required schema. Please generate a valid PatchPlan with summary and ops array.',
        },
      ];

      const retryCompletion = await openai.chat.completions.parse({
        model: 'gpt-4o',
        messages: repairMessages,
        response_format: zodResponseFormat(PatchPlanSchema, 'patch_plan'),
        temperature: 0.5,
      });

      const retryPatchPlan = retryCompletion.choices[0].message.parsed;

      if (!retryPatchPlan) {
        return res.status(500).json({
          error: 'AI response invalid after retry',
          message: 'The AI was unable to generate a valid response. Please try again.',
        });
      }

      console.log(`[AI] Repair successful, generated ${retryPatchPlan.ops.length} operations`);
      return res.json(retryPatchPlan);
    }

    console.log(`[AI] Success: generated ${patchPlan.ops.length} operations`);
    res.json(patchPlan);
  } catch (error) {
    console.error('[AI] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-server' });
});

app.listen(PORT, () => {
  console.log(`AI Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
