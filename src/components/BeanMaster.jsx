import React, { useState } from "react";
import { canDeleteBean } from "../domain/coffee/beanMaster.js";
import { serializeMaster } from "../domain/coffee/masterSnapshot.js";
import { profileLabels } from "../domain/coffee/profile.js";

export function BeanMaster({ beans, saveStatus, onAdd, onDelete, onSave }) {
  const canDelete = canDeleteBean(beans);
  const [expandedId, setExpandedId] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [editingBean, setEditingBean] = useState(null);
  const [draft, setDraft] = useState(() => createBeanDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = dialogMode === "edit";
  const dirty = editing && editingBean ? serializeBean(editingBean) !== serializeBean(draft) : true;

  function openAddDialog() {
    setDialogMode("add");
    setEditingBean(null);
    setDraft(createBeanDraft());
    setError("");
  }

  function openEditDialog(bean) {
    setDialogMode("edit");
    setEditingBean(bean);
    setDraft(cloneBean(bean));
    setError("");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingBean(null);
    setDraft(createBeanDraft());
    setSaving(false);
    setError("");
  }

  async function submitDialog(event) {
    event.preventDefault();
    if (saving || !draft.name.trim() || (editing && !dirty)) return;
    setSaving(true);
    setError("");
    const input = normalizeBeanDraft(draft);
    if (input.purchaseUrl && !/^https?:\/\//i.test(input.purchaseUrl)) {
      setError("購入先URLは http:// または https:// から入力してください。");
      setSaving(false);
      return;
    }
    const saved = editing ? await onSave(input) : await onAdd(input);
    setSaving(false);
    if (saved === false) {
      setError("保存できませんでした。もう一度試してください。");
      return;
    }
    closeDialog();
  }

  return (
    <section className="panel master-panel" aria-labelledby="masterTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Master</p>
          <h2 id="masterTitle">豆マスタ</h2>
        </div>
        <button className="ghost-button" type="button" title="豆を追加" disabled={saving} onClick={openAddDialog}>
          Add
        </button>
      </div>

      <div className="master-table bean-master-table">
        <div className="master-table-head" aria-hidden="true">
          <span>豆</span>
          <span>表示</span>
          <span>原価</span>
          {profileLabels.map(([key, label]) => <span key={key}>{label}</span>)}
          <span>操作</span>
        </div>
        {beans.map((bean) => {
          const expanded = expandedId === bean.id;
          return (
            <article className="master-table-row" data-expanded={expanded} key={bean.id}>
              <div className="master-primary-cell" data-label="豆">
                <div>
                  <h3>{bean.name}</h3>
                  <p>{bean.note || "メモなし"}</p>
                  {(bean.roasterName || bean.origin) && (
                    <small className="bean-secondary-meta">{[bean.roasterName, bean.origin].filter(Boolean).join(" / ")}</small>
                  )}
                </div>
                <button
                  className="master-expand-button"
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${bean.name}の詳細を${expanded ? "閉じる" : "開く"}`}
                  onClick={() => setExpandedId((current) => (current === bean.id ? null : bean.id))}
                />
              </div>
              <div className="master-table-cell" data-label="表示">
                <span className="status-pill" data-status={bean.visibleInRecipes === false ? "hidden" : "visible"}>
                  {bean.visibleInRecipes === false ? "非表示" : "表示中"}
                </span>
              </div>
              <div className="master-table-cell" data-label="原価">¥{Number(bean.costPerKg) || 0}/kg</div>
              {profileLabels.map(([key, label]) => (
                <div className="master-table-cell" data-label={label} key={key}>{Number(bean.profile[key]) || 0}</div>
              ))}
              <div className="master-table-actions" data-label="操作">
                <button className="ghost-button" type="button" disabled={saving} onClick={() => openEditDialog(bean)}>
                  Edit
                </button>
                <button
                  className="delete-bean"
                  type="button"
                  title={canDelete ? "豆を削除" : "最後の豆は削除できません"}
                  disabled={!canDelete || saving}
                  onClick={() => onDelete(bean.id)}
                >
                  Delete
                </button>
              </div>
              {saveStatus === "error" && <p className="inline-warning master-row-error">保存状態を確認してください。</p>}
            </article>
          );
        })}
      </div>

      {dialogMode && (
        <BeanMasterDialog
          mode={dialogMode}
          draft={draft}
          dirty={dirty}
          error={error}
          saving={saving}
          onChange={setDraft}
          onClose={closeDialog}
          onSubmit={submitDialog}
        />
      )}
    </section>
  );
}

function BeanMasterDialog({ mode, draft, dirty, error, saving, onChange, onClose, onSubmit }) {
  const title = mode === "add" ? "豆を追加" : "豆を編集";
  const saveLabel = mode === "add" ? "Create" : "Save";

  return (
    <div className="dialog-backdrop">
      <div className="master-dialog" role="dialog" aria-modal="true" aria-labelledby="beanMasterDialogTitle">
        <form className="master-dialog-form" onSubmit={onSubmit}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">Bean Master</p>
              <h3 id="beanMasterDialogTitle">{title}</h3>
            </div>
          </div>
          <div className="master-form-card">
            <div>
              <h4>基本情報</h4>
              <p>豆の表示名、原価、味わいの傾向を管理します。</p>
            </div>
            <div className="master-dialog-fields bean-dialog-fields">
              <label>豆名<input value={draft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>メモ<textarea rows="3" value={draft.note} onChange={(event) => onChange((current) => ({ ...current, note: event.target.value }))} /></label>
              <label className="checkbox-field">レシピ表示<input type="checkbox" checked={draft.visibleInRecipes !== false} onChange={(event) => onChange((current) => ({ ...current, visibleInRecipes: event.target.checked }))} /></label>
              <label>原価 円/kg<input type="number" min="0" step="1" value={draft.costPerKg} onChange={(event) => onChange((current) => ({ ...current, costPerKg: Math.max(0, Number(event.target.value) || 0) }))} /></label>
              {profileLabels.map(([key, label]) => (
                <label key={key}>{label}<input type="number" min="0" max="100" step="1" value={draft.profile[key]} onChange={(event) => onChange((current) => ({ ...current, profile: { ...current.profile, [key]: clampProfile(event.target.value) } }))} /></label>
              ))}
            </div>
          </div>
          <div className="master-form-card">
            <div>
              <h4>購入・豆情報</h4>
              <p>購入先や焙煎情報を記録します。これらの情報は個人用で、Discoverには公開されません。</p>
            </div>
            <div className="master-dialog-fields bean-dialog-fields">
              <label>焙煎店・ブランド<input value={draft.roasterName} onChange={(event) => onChange((current) => ({ ...current, roasterName: event.target.value }))} /></label>
              <label>産地<input value={draft.origin} onChange={(event) => onChange((current) => ({ ...current, origin: event.target.value }))} /></label>
              <label>精製方法<input value={draft.processMethod} onChange={(event) => onChange((current) => ({ ...current, processMethod: event.target.value }))} /></label>
              <label>標準焙煎度<input value={draft.defaultRoastLevel} placeholder="例：浅煎り" onChange={(event) => onChange((current) => ({ ...current, defaultRoastLevel: event.target.value }))} /></label>
              <label>焙煎日<input type="date" value={draft.roastedAt} onChange={(event) => onChange((current) => ({ ...current, roastedAt: event.target.value }))} /></label>
              <label>購入日<input type="date" value={draft.purchasedAt} onChange={(event) => onChange((current) => ({ ...current, purchasedAt: event.target.value }))} /></label>
              <label>購入場所<input value={draft.purchasePlace} onChange={(event) => onChange((current) => ({ ...current, purchasePlace: event.target.value }))} /></label>
              <label>購入先URL<input type="url" value={draft.purchaseUrl} placeholder="https://" onChange={(event) => onChange((current) => ({ ...current, purchaseUrl: event.target.value }))} /></label>
              <label>内容量 g<input type="number" min="0" step="1" value={draft.packageWeightGram} onChange={(event) => onChange((current) => ({ ...current, packageWeightGram: nonNegativeNumber(event.target.value) }))} /></label>
              <label>購入価格 円<input type="number" min="0" step="1" value={draft.purchasePrice} onChange={(event) => onChange((current) => ({ ...current, purchasePrice: nonNegativeNumber(event.target.value) }))} /></label>
            </div>
          </div>
          {error && <p className="inline-warning master-card-error">{error}</p>}
          <div className="button-row dialog-actions">
            <button className="ghost-button" type="button" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving || !draft.name.trim() || (mode === "edit" && !dirty)}>
              {saving ? "Saving" : saveLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function cloneBean(bean) {
  return {
    ...bean,
    roasterName: bean.roasterName || "",
    origin: bean.origin || "",
    processMethod: bean.processMethod || "",
    defaultRoastLevel: bean.defaultRoastLevel || "",
    roastedAt: bean.roastedAt || "",
    purchasedAt: bean.purchasedAt || "",
    purchasePlace: bean.purchasePlace || "",
    purchaseUrl: bean.purchaseUrl || "",
    packageWeightGram: Number(bean.packageWeightGram) || 0,
    purchasePrice: Number(bean.purchasePrice) || 0,
    profile: { ...bean.profile },
  };
}

function normalizeBeanDraft(bean) {
  return {
    ...bean,
    name: bean.name.trim(),
    note: bean.note.trim(),
    visibleInRecipes: bean.visibleInRecipes !== false,
    costPerKg: Math.max(0, Number(bean.costPerKg) || 0),
    roasterName: String(bean.roasterName || "").trim(),
    origin: String(bean.origin || "").trim(),
    processMethod: String(bean.processMethod || "").trim(),
    defaultRoastLevel: String(bean.defaultRoastLevel || "").trim(),
    roastedAt: bean.roastedAt || "",
    purchasedAt: bean.purchasedAt || "",
    purchasePlace: String(bean.purchasePlace || "").trim(),
    purchaseUrl: String(bean.purchaseUrl || "").trim(),
    packageWeightGram: nonNegativeNumber(bean.packageWeightGram),
    purchasePrice: nonNegativeNumber(bean.purchasePrice),
    profile: Object.fromEntries(profileLabels.map(([key]) => [key, clampProfile(bean.profile[key])])),
  };
}

function serializeBean(bean) {
  return serializeMaster(normalizeBeanDraft(cloneBean(bean)));
}

function clampProfile(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function nonNegativeNumber(value) {
  return Math.max(0, Number(value) || 0);
}

function createBeanDraft() {
  return {
    name: "",
    note: "",
    visibleInRecipes: true,
    costPerKg: 0,
    roasterName: "",
    origin: "",
    processMethod: "",
    defaultRoastLevel: "",
    roastedAt: "",
    purchasedAt: "",
    purchasePlace: "",
    purchaseUrl: "",
    packageWeightGram: 0,
    purchasePrice: 0,
    profile: Object.fromEntries(profileLabels.map(([key]) => [key, 50])),
  };
}
