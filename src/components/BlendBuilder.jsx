import React, { useEffect, useState } from "react";
import { roastLevelOptions } from "../domain/coffee/roast.js";
import { RecipeComparisonReferenceSelect, RecipeComparisonSummary } from "./RecipeComparison.jsx";

export function BlendBuilder({
  beans,
  availableBeans = [],
  total,
  onAddBean = () => {},
  onRemoveBean = () => {},
  onRatioChange,
  onRoastLevelChange = () => {},
  onNormalize,
  recipeSeries = [],
  comparisonReferenceVersionId = "",
  comparison = null,
  onComparisonReferenceChange = () => {},
  onOpenComparison = () => {},
}) {
  const [expandedBeanId, setExpandedBeanId] = useState("");
  const [showBeanPicker, setShowBeanPicker] = useState(false);
  const [pendingBeanIds, setPendingBeanIds] = useState([]);

  useEffect(() => {
    if (expandedBeanId && !beans.some((bean) => bean.id === expandedBeanId)) {
      setExpandedBeanId("");
    }
  }, [beans, expandedBeanId]);

  function openBeanPicker() {
    setPendingBeanIds([]);
    setShowBeanPicker((current) => !current);
  }

  function togglePendingBean(id) {
    setPendingBeanIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function addPendingBeans() {
    pendingBeanIds.forEach((id) => onAddBean(id));
    setPendingBeanIds([]);
    setShowBeanPicker(false);
  }

  function cancelBeanPicker() {
    setPendingBeanIds([]);
    setShowBeanPicker(false);
  }

  function removeBean(id) {
    onRemoveBean(id);
    setExpandedBeanId("");
  }

  return (
    <section className="panel builder-panel" aria-labelledby="builderTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Blend Builder</p>
          <h2 id="builderTitle">配合</h2>
        </div>
      </div>
      <RecipeComparisonReferenceSelect
        recipeSeries={recipeSeries}
        value={comparisonReferenceVersionId}
        onChange={onComparisonReferenceChange}
      />
      <RecipeComparisonSummary comparison={comparison} section="blend" onOpen={onOpenComparison} />
      {beans.some((bean) => bean.isSnapshotOnly) && (
        <p className="snapshot-only-note">一部の豆は保存時点の情報で表示しています。</p>
      )}
      <div className="bean-list">
        {beans.length === 0 ? (
          <p className="empty-state">今回のブレンドに使う豆を追加してください。</p>
        ) : beans.map((bean) => (
          <article className="bean-item" key={bean.id}>
            <div className="bean-top">
              <span className="swatch" style={{ background: bean.color }} />
              <div>
                <p className="bean-name">
                  {bean.name}
                  {bean.isSnapshotOnly ? (
                    <span className="status-pill" data-status="snapshot">保存時点</span>
                  ) : bean.visibleInRecipes === false ? (
                    <span className="status-pill" data-status="hidden">非表示中</span>
                  ) : null}
                </p>
                <p className="bean-note" title={bean.note}>{bean.note}</p>
                <p className="bean-meta">{roastLevelLabel(bean.roastLevel)}</p>
              </div>
              <div className="bean-actions">
                <output className="ratio-output">{bean.ratio ? `${bean.ratio}%` : "0%"}</output>
                <button
                  className="ghost-button bean-edit-button"
                  type="button"
                  onClick={() => setExpandedBeanId(expandedBeanId === bean.id ? "" : bean.id)}
                >
                  {expandedBeanId === bean.id ? "閉じる" : "編集"}
                </button>
              </div>
            </div>
            {expandedBeanId === bean.id && (
              <div className="bean-detail">
                <div className="slider-row">
                  <button className="ratio-button" type="button" title="5%減らす" onClick={() => onRatioChange(bean.id, bean.ratio - 5)}>-</button>
                  <input type="range" min="0" max="100" step="5" value={bean.ratio} aria-label={`${bean.name}の比率`} onChange={(event) => onRatioChange(bean.id, event.target.value)} />
                  <button className="ratio-button" type="button" title="5%増やす" onClick={() => onRatioChange(bean.id, bean.ratio + 5)}>+</button>
                </div>
                <label className="roast-level-field">
                  焙煎度
                  <select value={bean.roastLevel || ""} onChange={(event) => onRoastLevelChange(bean.id, event.target.value)}>
                    {roastLevelOptions.map(([value, label]) => (
                      <option key={value || "unset"} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <button className="ghost-button remove-blend-bean-button" type="button" onClick={() => removeBean(bean.id)}>
                  このブレンドから外す
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="bean-picker">
        <button
          className="primary-button add-blend-bean-button"
          type="button"
          disabled={!availableBeans.length}
          onClick={openBeanPicker}
        >
          豆を追加
        </button>
        {showBeanPicker && (
          <div className="bean-picker-panel">
            <div className="bean-picker-list">
              {availableBeans.map((bean) => (
                <label className="bean-picker-item" key={bean.id}>
                  <input
                    type="checkbox"
                    checked={pendingBeanIds.includes(bean.id)}
                    onChange={() => togglePendingBean(bean.id)}
                  />
                  <span className="swatch" style={{ background: bean.color }} />
                  <div>
                    <p className="bean-name">{bean.name}</p>
                    <p className="bean-note" title={bean.note}>{bean.note}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="bean-picker-actions">
              <button className="primary-button" type="button" disabled={!pendingBeanIds.length} onClick={addPendingBeans}>
                追加
              </button>
              <button className="ghost-button" type="button" onClick={cancelBeanPicker}>
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="blend-total-bar" data-ok={total === 100}>
        <div>
          <span>合計</span>
          <strong>{total}%</strong>
        </div>
        <button className="normalize-button" type="button" title="合計を100%に調整" disabled={!beans.length || total === 100} onClick={onNormalize}>
          {total === 100 ? "調整済み" : "100%に正規化"}
        </button>
      </div>
      {total > 0 && total !== 100 && <p className="inline-warning">合計は{total}%です。100%に正規化できます。</p>}
    </section>
  );
}

function roastLevelLabel(value) {
  if (!value) return "焙煎度未設定";
  return roastLevelOptions.find(([optionValue]) => optionValue === value)?.[1] || "焙煎度未設定";
}
