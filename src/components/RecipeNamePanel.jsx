import React from "react";

export function RecipeNamePanel({
  blendName,
  blendGoal,
  editingRecipeSource,
  onNameChange,
  onBlendGoalChange,
}) {
  return (
    <section className="panel recipe-name-panel" aria-labelledby="recipeNameTitle">
      <div className="recipe-name-form">
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
      </div>
    </section>
  );
}
