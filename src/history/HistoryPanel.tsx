import { useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';
import type { HistoryLog } from './historyLog';
import { buildDocAtRevision } from './rebuildDoc';
import './HistoryPanel.css';

interface HistoryPanelProps {
  historyLog: HistoryLog;
  onPreviewChange: (doc: Y.Doc | null) => void;
}

export function HistoryPanel({ historyLog, onPreviewChange }: HistoryPanelProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [latestRev, setLatestRev] = useState(historyLog.getLatestRev());
  const [selectedRev, setSelectedRev] = useState(latestRev);

  // Subscribe to history log updates
  useEffect(() => {
    return historyLog.subscribe(() => {
      const newLatest = historyLog.getLatestRev();
      setLatestRev(newLatest);
    });
  }, [historyLog]);

  // When enabling preview, default to latest revision
  const togglePreview = () => {
    const newMode = !previewMode;
    if (newMode) {
      setSelectedRev(latestRev);
    }
    setPreviewMode(newMode);
  };

  // Build the preview document when relevant state changes
  const previewDoc = useMemo(() => {
    if (!previewMode || selectedRev <= 0) {
      return null;
    }
    return buildDocAtRevision(selectedRev, historyLog);
  }, [previewMode, selectedRev, historyLog]);

  // Notify parent about preview document changes
  useEffect(() => {
    onPreviewChange(previewDoc);
  }, [previewDoc, onPreviewChange]);

  // Cleanup old preview docs
  useEffect(() => {
    return () => {
      if (previewDoc) {
        previewDoc.destroy();
      }
    };
  }, [previewDoc]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRev(Number(e.target.value));
  };

  const handlePrevious = () => {
    if (selectedRev > 1) {
      setSelectedRev(selectedRev - 1);
    }
  };

  const handleNext = () => {
    if (selectedRev < latestRev) {
      setSelectedRev(selectedRev + 1);
    }
  };

  const entries = historyLog.getEntries();
  const selectedEntry = entries.find((e) => e.rev === selectedRev);
  const sliderPercent = latestRev > 1
    ? ((selectedRev - 1) / (latestRev - 1)) * 100
    : 100;

  if (latestRev === 0) {
    return (
      <div className="history-panel">
        <div className="history-empty">
          <div style={{ fontSize: '24px' }}>📝</div>
          <div>Start editing to create history!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>
          History
        </h3>
      </div>

      <div className="history-content">
        {!previewMode ? (
          <div className="history-empty">
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🕰️</div>
            <p>
              Total Revisions: <strong>{latestRev}</strong>
            </p>
          </div>
        ) : (
          <>
            <div className="revision-card">
              <div className="revision-number">
                {selectedRev} <span style={{ color: '#cbd5e1', fontWeight: 300 }}>/</span> {latestRev}
              </div>
              <div className="revision-label">Current Revision</div>
              {selectedEntry && (
                <div className="revision-time">
                  Saved at {new Date(selectedEntry.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="history-slider-section">
              <div className="history-slider-wrapper">
                <div className="history-slider-fill" style={{ width: `${sliderPercent}%` }} />
                <input
                  type="range"
                  min="1"
                  max={latestRev}
                  value={selectedRev}
                  onChange={handleSliderChange}
                  className="history-slider"
                />
              </div>
              <div className="slider-labels">
                <span>Start</span>
                <span>Latest</span>
              </div>
            </div>

            <div className="history-controls">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={selectedRev <= 1}
                className="history-nav-button"
                title="Previous Revision"
              >
                ←
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={selectedRev >= latestRev}
                className="history-nav-button"
                title="Next Revision"
              >
                →
              </button>
            </div>
          </>
        )}
      </div>

      <div className="history-actions">
        <button
          type="button"
          className={`preview-btn ${previewMode ? 'exit' : 'start'}`}
          onClick={togglePreview}
        >
          {previewMode ? 'Exit Preview Mode' : 'Enable Time Travel'}
        </button>
      </div>
    </div>
  );
}
