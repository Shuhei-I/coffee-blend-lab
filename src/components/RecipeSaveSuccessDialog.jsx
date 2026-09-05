import React from "react";

export function RecipeSaveSuccessDialog({ recipe, onPublish, onViewHistory }) {
  return (
    <div className="dialog-backdrop">
      <div className="master-dialog recipe-save-success-dialog" role="dialog" aria-modal="true" aria-labelledby="recipeSaveSuccessTitle">
        <div className="master-dialog-form">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">保存完了</p>
              <h3 id="recipeSaveSuccessTitle">レシピを登録しました</h3>
            </div>
          </div>
          <p className="recipe-save-success-name">{recipe.name} v{recipe.version}</p>
          <div className="button-row dialog-actions">
            <button className="ghost-button" type="button" onClick={onViewHistory}>履歴を見る</button>
            <button className="primary-button" type="button" onClick={onPublish}>公開する</button>
          </div>
        </div>
      </div>
    </div>
  );
}
