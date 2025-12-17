import * as Y from 'yjs';

export interface HistoryEntry {
  rev: number;
  timestamp: number;
  update: Uint8Array;
}

type Listener = () => void;

export class HistoryLog {
  private entries: HistoryEntry[] = [];
  private currentRev = 0;
  private listeners: Set<Listener> = new Set();
  
  // Buffering
  private pendingUpdates: Uint8Array[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCommitTime = 0;
  private readonly DEBOUNCE_MS = 1000; // 1 second of inactivity to commit
  private readonly MAX_WAIT_MS = 5000; // Max 5 seconds before forcing commit

  constructor() {}

  // Subscribe to changes
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  append(update: Uint8Array): void {
    this.pendingUpdates.push(update);
    
    const now = Date.now();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.pendingUpdates.length > 0 && now - this.lastCommitTime > this.MAX_WAIT_MS) {
      this.commit();
    } else {
      this.debounceTimer = setTimeout(() => {
        this.commit();
      }, this.DEBOUNCE_MS);
    }
  }

  private commit(): void {
    if (this.pendingUpdates.length === 0) return;

    // Merge updates
    const mergedUpdate = Y.mergeUpdates(this.pendingUpdates);
    this.pendingUpdates = [];
    this.lastCommitTime = Date.now();
    this.debounceTimer = null;

    this.currentRev++;
    
    this.entries.push({
      rev: this.currentRev,
      timestamp: Date.now(),
      update: mergedUpdate,
    });

    this.notify();
  }

  getLatestRev(): number {
    return this.currentRev;
  }

  getEntries(): readonly HistoryEntry[] {
    return this.entries;
  }

  getEntriesUpTo(targetRev: number): readonly HistoryEntry[] {
    return this.entries.filter((entry) => entry.rev <= targetRev);
  }

  clear(): void {
    this.entries = [];
    this.currentRev = 0;
    this.pendingUpdates = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.notify();
  }
}

export function createHistoryLog(
  ydoc: Y.Doc
): HistoryLog {
  const historyLog = new HistoryLog();

  ydoc.on('update', (update: Uint8Array) => {
    historyLog.append(update);
  });

  return historyLog;
}
