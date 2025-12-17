import * as Y from 'yjs';
import type { HistoryLog } from './historyLog';

export function buildDocAtRevision(
  targetRev: number,
  historyLog: HistoryLog
): Y.Doc {
  const doc = new Y.Doc();


  const entries = historyLog.getEntriesUpTo(targetRev);

  if (entries.length > 0) {
    const updates = entries.map(entry => entry.update);
    const mergedUpdate = Y.mergeUpdates(updates);
    Y.applyUpdate(doc, mergedUpdate);
  }

  return doc;
}
