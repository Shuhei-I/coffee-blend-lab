import React, { useState } from "react";
import { canDeleteBrewMethod } from "../domain/coffee/brewMethodMaster.js";
import { getPourTotal, normalizePercent } from "../domain/coffee/calculations.js";
import { serializeMaster } from "../domain/coffee/masterSnapshot.js";

export function BrewMethodMaster({ methods, saveStatus, onAdd, onDelete, onSave }) {
  const canDelete = canDeleteBrewMethod(methods);
  const [expandedId, setExpandedId] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [editingMethod, setEditingMethod] = useState(null);
  const [draft, setDraft] = useState(() => createBrewMethodDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = dialogMode === "edit";
  const dirty = editing && editingMethod ? serializeMaster(normalizeBrewMethodDraft(editingMethod)) !== serializeMaster(normalizeBrewMethodDraft(draft)) : true;

  function openAddDialog() {
    setDialogMode("add");
    setEditingMethod(null);
    setDraft(createBrewMethodDraft());
    setError("");
  }

  function openEditDialog(method) {
    setDialogMode("edit");
    setEditingMethod(method);
    setDraft({ ...method });
    setError("");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingMethod(null);
    setDraft(createBrewMethodDraft());
    setSaving(false);
    setError("");
  }

  async function submitDialog(event) {
    event.preventDefault();
    if (saving || !draft.name.trim() || (editing && !dirty)) return;
    setSaving(true);
    setError("");
    const input = normalizeBrewMethodDraft(draft);
    const saved = editing ? await onSave(input) : await onAdd(input);
    setSaving(false);
    if (saved === false) {
      setError("保存できませんでした。もう一度試してください。");
      return;
    }
    closeDialog();
  }

  return (
    <section className="panel brew-master-panel" aria-labelledby="brewMasterTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Brew Master</p>
          <h2 id="brewMasterTitle">淹れ方マスタ</h2>
        </div>
        <button className="ghost-button" type="button" title="淹れ方を追加" disabled={saving} onClick={openAddDialog}>
          Add
        </button>
      </div>

      <div className="master-table brew-master-table">
        <div className="master-table-head" aria-hidden="true">
          <span>名称</span>
          <span>合計</span>
          <span>蒸らし</span>
          <span>秒</span>
          <span>1投目</span>
          <span>2投目</span>
          <span>3投目</span>
          <span>操作</span>
        </div>
        {methods.map((method) => {
          const expanded = expandedId === method.id;
          return (
            <article className="master-table-row" data-expanded={expanded} key={method.id}>
              <div className="master-primary-cell" data-label="名称">
                <div>
                  <h3>{method.name}</h3>
                  <p>{method.note || "メモなし"}</p>
                </div>
                <button
                  className="master-expand-button"
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${method.name}の詳細を${expanded ? "閉じる" : "開く"}`}
                  onClick={() => setExpandedId((current) => (current === method.id ? null : method.id))}
                />
              </div>
              <div className="master-table-cell" data-label="合計">
                <span className="status-pill">{getPourTotal(method)}%</span>
              </div>
              <div className="master-table-cell" data-label="蒸らし">{Number(method.bloomPercent) || 0}%</div>
              <div className="master-table-cell" data-label="秒">{Number(method.bloomSeconds) || 0}秒</div>
              <div className="master-table-cell" data-label="1投目">{Number(method.pour1Percent) || 0}%</div>
              <div className="master-table-cell" data-label="2投目">{Number(method.pour2Percent) || 0}%</div>
              <div className="master-table-cell" data-label="3投目">{Number(method.pour3Percent) || 0}%</div>
              <div className="master-table-actions" data-label="操作">
                <button className="ghost-button" type="button" disabled={saving} onClick={() => openEditDialog(method)}>
                  Edit
                </button>
                <button
                  className="delete-bean"
                  type="button"
                  title={canDelete ? "淹れ方を削除" : "最後の淹れ方は削除できません"}
                  disabled={!canDelete || saving}
                  onClick={() => onDelete(method.id)}
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
        <BrewMethodDialog
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

function BrewMethodDialog({ mode, draft, dirty, error, saving, onChange, onClose, onSubmit }) {
  const title = mode === "add" ? "淹れ方を追加" : "淹れ方を編集";
  const saveLabel = mode === "add" ? "Create" : "Save";

  return (
    <div className="dialog-backdrop">
      <div className="master-dialog" role="dialog" aria-modal="true" aria-labelledby="brewMasterDialogTitle">
        <form className="master-dialog-form" onSubmit={onSubmit}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">Brew Master</p>
              <h3 id="brewMasterDialogTitle">{title}</h3>
            </div>
          </div>
          <div className="master-form-card">
            <div>
              <h4>基本情報</h4>
              <p>抽出名、メモ、蒸らしと注湯比率を管理します。</p>
            </div>
            <div className="master-dialog-fields brew-dialog-fields">
              <BrewMethodFields draft={draft} onChange={onChange} />
              <div className="brew-total" data-ok={getPourTotal(draft) === 100}>{getPourTotal(draft)}%</div>
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

function BrewMethodFields({ draft, onChange }) {
  return (
    <>
      <label>名称<input value={draft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} /></label>
      <label>メモ<textarea rows="3" value={draft.note} onChange={(event) => onChange((current) => ({ ...current, note: event.target.value }))} /></label>
      <label>蒸らし %<input type="number" min="0" max="100" step="1" value={draft.bloomPercent} onChange={(event) => onChange((current) => ({ ...current, bloomPercent: normalizePercent(event.target.value) }))} /></label>
      <label>蒸らし 秒<input type="number" min="0" step="5" value={draft.bloomSeconds} onChange={(event) => onChange((current) => ({ ...current, bloomSeconds: Math.max(0, Number(event.target.value) || 0) }))} /></label>
      <label>1投目 %<input type="number" min="0" max="100" step="1" value={draft.pour1Percent} onChange={(event) => onChange((current) => ({ ...current, pour1Percent: normalizePercent(event.target.value) }))} /></label>
      <label>2投目 %<input type="number" min="0" max="100" step="1" value={draft.pour2Percent} onChange={(event) => onChange((current) => ({ ...current, pour2Percent: normalizePercent(event.target.value) }))} /></label>
      <label>3投目 %<input type="number" min="0" max="100" step="1" value={draft.pour3Percent} onChange={(event) => onChange((current) => ({ ...current, pour3Percent: normalizePercent(event.target.value) }))} /></label>
    </>
  );
}

function normalizeBrewMethodDraft(draft) {
  return {
    ...draft,
    name: draft.name.trim(),
    note: draft.note.trim(),
    bloomPercent: normalizePercent(draft.bloomPercent),
    pour1Percent: normalizePercent(draft.pour1Percent),
    pour2Percent: normalizePercent(draft.pour2Percent),
    pour3Percent: normalizePercent(draft.pour3Percent),
    bloomSeconds: Math.max(0, Number(draft.bloomSeconds) || 0),
  };
}

function createBrewMethodDraft() {
  return {
    name: "",
    note: "",
    bloomPercent: 12,
    pour1Percent: 28,
    pour2Percent: 30,
    pour3Percent: 30,
    bloomSeconds: 30,
  };
}
