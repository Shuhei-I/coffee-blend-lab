import React from "react";
import { canDeleteBean } from "../domain/coffee/beanMaster.js";
import { profileLabels } from "../domain/coffee/profile.js";

export function MasterSaveActions({ dirty, status, onSave, onRevert }) {
  const saving = status === "saving";
  const label = saving ? "Saving" : status === "error" ? "Error" : dirty ? "Unsaved" : "Saved";

  return (
    <div className="master-save-bar">
      <span className="master-save-status" data-status={status} data-dirty={dirty}>
        {label}
      </span>
      <div className="button-row">
        <button className="ghost-button" type="button" disabled={!dirty || saving} onClick={onRevert}>
          Revert
        </button>
        <button className="primary-button" type="button" disabled={!dirty || saving} onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}

export function BeanMaster({ beans, dirty, saveStatus, onAdd, onDelete, onUpdate, onProfileUpdate, onSave, onRevert }) {
  const canDelete = canDeleteBean(beans);

  return (
    <section className="panel master-panel" aria-labelledby="masterTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Master</p>
          <h2 id="masterTitle">豆マスタ</h2>
        </div>
        <button className="ghost-button" type="button" title="豆を追加" onClick={onAdd}>Add</button>
      </div>
      <MasterSaveActions dirty={dirty} status={saveStatus} onSave={onSave} onRevert={onRevert} />
      <div className="master-list">
        {beans.map((bean) => (
          <article className="master-row" key={bean.id}>
            <label>豆名<input value={bean.name} onChange={(event) => onUpdate(bean.id, { name: event.target.value })} /></label>
            <label>メモ<input value={bean.note} onChange={(event) => onUpdate(bean.id, { note: event.target.value })} /></label>
            <label className="checkbox-field">レシピ表示<input type="checkbox" checked={bean.visibleInRecipes !== false} onChange={(event) => onUpdate(bean.id, { visibleInRecipes: event.target.checked })} /></label>
            <label>原価 円/kg<input type="number" min="0" step="1" value={bean.costPerKg} onChange={(event) => onUpdate(bean.id, { costPerKg: Math.max(0, Number(event.target.value) || 0) })} /></label>
            {profileLabels.map(([key, label]) => (
              <label key={key}>{label}<input type="number" min="0" max="100" step="1" value={bean.profile[key]} onChange={(event) => onProfileUpdate(bean.id, key, event.target.value)} /></label>
            ))}
            <button
              className="delete-bean"
              type="button"
              title={canDelete ? "豆を削除" : "最後の豆は削除できません"}
              disabled={!canDelete}
              onClick={() => onDelete(bean.id)}
            >
              Delete
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
