import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { generateDocOutline } from './generateDocOutline';
import { applyPatchPlan } from './applyPatchPlan';
import type { ChatMessage, PatchPlan } from './types';
import './AiChatPanel.css';

interface AiChatPanelProps {
  editor: Editor | null;
  isReadOnly: boolean;
}

export function AiChatPanel({ editor, isReadOnly }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPatchSummary, setLastPatchSummary] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !editor || isReadOnly || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    setLastPatchSummary(null);

    try {
      // Generate document outline
      const docOutline = generateDocOutline(editor);
      const docHtml = editor.getHTML();

      // Prepare request payload
      const payload = {
        messages: [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        docOutline,
        docHtml: docHtml.length < 50000 ? docHtml : undefined,
      };

      // Call AI server
      const response = await fetch('/api/ai/patch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const patchPlan: PatchPlan = await response.json();

      // Show summary
      setLastPatchSummary(patchPlan.summary);

      // Apply patch plan
      const result = applyPatchPlan(editor, patchPlan);

      if (result.success) {
        // Add assistant response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: patchPlan.summary,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        editor.commands.focus();
      } else {
        throw new Error(result.error || 'Failed to apply patch');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('[AI] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!editor) {
    return (
      <div className="ai-chat-panel">
        <div className="ai-chat-loading">
          <p>Waiting for editor...</p>
        </div>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="ai-chat-panel">
        <div className="ai-chat-disabled">
          <p>⚠️ AI editing is disabled in preview mode</p>
          <p className="ai-chat-hint">Return to live editing to use AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <h2>🤖 AI Assistant</h2>
        <p className="ai-chat-subtitle">Ask me to edit your document</p>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <p>👋 Hello! I can help you edit this document.</p>
            <p className="ai-chat-hint">Try asking me to:</p>
            <ul className="ai-chat-examples">
              <li>"Add a heading and introduction"</li>
              <li>"Make this text more concise"</li>
              <li>"Convert this to a bullet list"</li>
              <li>"Add code examples"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-chat-message ai-chat-message-${msg.role}`}>
            <div className="ai-chat-message-label">
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className="ai-chat-message-content">{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-chat-message ai-chat-message-assistant">
            <div className="ai-chat-message-label">AI</div>
            <div className="ai-chat-message-content ai-chat-loading-dots">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="ai-chat-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {lastPatchSummary && !error && (
        <div className="ai-chat-success">
          <strong>Applied:</strong> {lastPatchSummary}
        </div>
      )}

      <div className="ai-chat-input-container">
        <textarea
          className="ai-chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask AI to edit the document..."
          disabled={isLoading}
          rows={3}
        />
        <button
          className="ai-chat-send"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
