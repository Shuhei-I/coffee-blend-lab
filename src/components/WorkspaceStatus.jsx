import React from "react";

export function WorkspaceStatus({ loading, loadError, saveError }) {
  const loadErrorMessage = toStatusMessage(loadError);
  const saveErrorMessage = toStatusMessage(saveError);

  if (!loading && !loadError && !saveError) return null;

  return (
    <div className="workspace-status" aria-label="ワークスペース状態">
      {loading && (
        <div className="workspace-status-item" data-status="loading" role="status">
          データを読み込んでいます。
        </div>
      )}
      {loadErrorMessage && (
        <div className="workspace-status-item" data-status="error" role="alert">
          <strong>データを読み込めませんでした。</strong>
          <span>{loadErrorMessage}</span>
        </div>
      )}
      {loadError && !loadErrorMessage && (
        <div className="workspace-status-item" data-status="error" role="alert">
          データを読み込めませんでした。
        </div>
      )}
      {saveErrorMessage && (
        <div className="workspace-status-item" data-status="error" role="alert">
          <strong>保存できませんでした。</strong>
          <span>{saveErrorMessage}</span>
        </div>
      )}
      {saveError && !saveErrorMessage && (
        <div className="workspace-status-item" data-status="error" role="alert">
          保存できませんでした。
        </div>
      )}
    </div>
  );
}

function toStatusMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error.message === "string" && error.message.trim()) return error.message;
  return "";
}
