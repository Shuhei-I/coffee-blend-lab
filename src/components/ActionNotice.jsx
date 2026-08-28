import React from "react";

export function ActionNotice({ message, actionLabel, onAction, className = "" }) {
  return (
    <div className={`action-notice ${className}`.trim()} role="status">
      <span className="action-notice-icon" aria-hidden="true">✓</span>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="action-notice-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
