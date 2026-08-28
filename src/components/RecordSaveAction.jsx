import React from "react";
import { ActionNotice } from "./ActionNotice.jsx";

export function RecordSaveAction({ disabled, disabledReason, saveMessage, onSave, onViewHistory }) {
  return (
    <div className="record-save-action">
      {disabled && disabledReason && (
        <p className="inline-warning" role="status">{disabledReason}</p>
      )}
      <button className="save-page-button" type="button" title={disabledReason || "保存"} disabled={disabled} onClick={onSave}>
        保存
      </button>
      {saveMessage && (
        <ActionNotice
          className="record-save-notice"
          message={saveMessage}
          actionLabel="履歴を見る"
          onAction={onViewHistory}
        />
      )}
    </div>
  );
}
