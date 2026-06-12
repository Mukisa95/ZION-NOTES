import React, { useEffect, useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';

/**
 * OfflineBanner
 * Slim animated status pill that shows:
 *  🔴 Offline — changes saved locally
 *  🔄 Syncing N changes…
 *  ✅ All synced  (fades out after 3s)
 */
const OfflineBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useNetwork();
  const [showSynced, setShowSynced] = useState(false);
  const [prevSyncing, setPrevSyncing] = useState(false);
  const [visible, setVisible] = useState(false);

  // Detect transition: syncing → done → show "All synced" briefly
  useEffect(() => {
    if (prevSyncing && !isSyncing && isOnline && pendingCount === 0) {
      setShowSynced(true);
      setVisible(true);
      const timer = setTimeout(() => {
        setShowSynced(false);
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    setPrevSyncing(isSyncing);
  }, [isSyncing, isOnline, pendingCount, prevSyncing]);

  // Show banner when offline OR syncing
  useEffect(() => {
    if (!isOnline || isSyncing) {
      setVisible(true);
    } else if (!showSynced) {
      setVisible(false);
    }
  }, [isOnline, isSyncing, showSynced]);

  if (!visible) return null;

  // ---- State derivation ----
  let bgColor: string;
  let borderColor: string;
  let dotColor: string;
  let icon: string;
  let text: string;

  if (!isOnline) {
    bgColor = 'rgba(30, 10, 10, 0.88)';
    borderColor = 'rgba(239, 68, 68, 0.4)';
    dotColor = '#ef4444';
    icon = '📴';
    text = pendingCount > 0
      ? `Offline — ${pendingCount} change${pendingCount !== 1 ? 's' : ''} saved locally`
      : 'Offline — changes saved locally';
  } else if (isSyncing) {
    bgColor = 'rgba(10, 20, 40, 0.88)';
    borderColor = 'rgba(59, 130, 246, 0.4)';
    dotColor = '#3b82f6';
    icon = '🔄';
    text = pendingCount > 0
      ? `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}…`
      : 'Syncing…';
  } else {
    // showSynced
    bgColor = 'rgba(5, 25, 15, 0.88)';
    borderColor = 'rgba(34, 197, 94, 0.4)';
    dotColor = '#22c55e';
    icon = '✅';
    text = 'All changes synced';
  }

  return (
    <>
      <style>{`
        @keyframes offlineBannerIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)      scale(1);    }
        }
        @keyframes offlineBannerOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes offlineDotPulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.5; transform: scale(1.4);  }
        }
        @keyframes offlineSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .offline-banner-root {
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          animation: offlineBannerIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          pointer-events: none;
        }
        .offline-banner-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--ob-border);
          background: var(--ob-bg);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2);
          color: #f1f5f9;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .offline-banner-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--ob-dot);
          flex-shrink: 0;
          animation: offlineDotPulse 1.6s ease-in-out infinite;
        }
        .offline-banner-dot.spin-icon {
          animation: offlineSpin 1s linear infinite;
          background: transparent;
          font-size: 13px;
          width: auto;
          height: auto;
        }
      `}</style>
      <div className="offline-banner-root">
        <div
          className="offline-banner-pill"
          style={{
            '--ob-bg': bgColor,
            '--ob-border': borderColor,
            '--ob-dot': dotColor,
          } as React.CSSProperties}
        >
          {isSyncing ? (
            <span className="offline-banner-dot spin-icon" role="img" aria-label="syncing">🔄</span>
          ) : (
            <span className="offline-banner-dot" aria-hidden="true" />
          )}
          <span>{text}</span>
        </div>
      </div>
    </>
  );
};

export default OfflineBanner;
