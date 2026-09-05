import React from "react";
import { RecipeSaveSuccessDialog } from "./RecipeSaveSuccessDialog.jsx";

export function RecordSaveAction({
  disabled,
  disabledReason,
  savedRecipe = null,
  onSave,
  onPublish,
  onViewHistory,
}) {
  return (
    <div className="record-save-action">
      {disabled && disabledReason && (
        <p className="inline-warning" role="status">{disabledReason}</p>
      )}
      <button className="save-page-button" type="button" title={disabledReason || "保存"} disabled={disabled} onClick={onSave}>
        保存
      </button>
      {savedRecipe && (
        <RecipeSaveSuccessDialog
          recipe={savedRecipe}
          onPublish={onPublish}
          onViewHistory={onViewHistory}
        />
      )}
    </div>
  );
}
