import React from "react";

export function RecipeNamePanel({
  blendName,
  changeNote,
  saveMessage,
  editingRecipeSource,
  onNameChange,
  onChangeNoteChange,
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
          メモ
          <input value={changeNote} maxLength={64} onChange={(event) => onChangeNoteChange(event.target.value)} />
        </label>
        <button type="submit" title="保存">Save</button>
      </form>
      {saveMessage && <div className="save-toast" role="status">{saveMessage}</div>}
    </section>
  );
}
