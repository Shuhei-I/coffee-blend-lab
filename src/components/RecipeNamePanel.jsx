import React from "react";

export function RecipeNamePanel({
  blendName,
  blendGoal,
  saveMessage,
  editingRecipeSource,
  saveDisabled = false,
  saveDisabledReason = "",
  onNameChange,
  onBlendGoalChange,
  onSave,
}) {
  return (
    <section className="panel recipe-name-panel" aria-labelledby="recipeNameTitle">
      <form className="recipe-name-form" onSubmit={onSave}>
        <div>
          <p className="eyebrow">Current Recipe</p>
          <h2 id="recipeNameTitle">{editingRecipeSource ? "次バージョン作成" : "新規シリーズ作成"}</h2>
        </div>
        <label>
          シリーズ名
          <input value={blendName} maxLength={28} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label>
          ブレンド説明
          <textarea rows="2" maxLength={160} placeholder="目指す味、構成、飲みたいシーン" value={blendGoal} onChange={(event) => onBlendGoalChange(event.target.value)} />
        </label>
        <button type="submit" title={saveDisabledReason || "保存"} disabled={saveDisabled}>
          Save
        </button>
      </form>
      {saveDisabled && saveDisabledReason && (
        <p className="inline-warning" role="status">{saveDisabledReason}</p>
      )}
      {saveMessage && <div className="save-toast" role="status">{saveMessage}</div>}
    </section>
  );
}
