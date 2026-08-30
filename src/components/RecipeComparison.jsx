import React from "react";
import { roastLevelOptions } from "../domain/coffee/roast.js";

export function RecipeComparisonReferenceSelect({ recipeSeries = [], value = "", onChange }) {
  if (!recipeSeries.length) return null;

  return (
    <div className="comparison-reference-row">
      <label htmlFor="comparisonReference">過去のレシピを参照</label>
      <select id="comparisonReference" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">参照するレシピを選択</option>
        {recipeSeries.filter((series) => series.status !== "archived").map((series) => (
          <optgroup label={series.name} key={series.id}>
            {(series.versions || []).map((version) => (
              <option value={version.id} key={version.id}>
                v{version.version}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function RecipeComparisonSummary({ comparison, section, onOpen }) {
  if (!comparison) return null;

  const isBlend = section === "blend";
  const count = isBlend ? comparison.blendChangeCount : comparison.brewChangeCount;
  const label = isBlend ? "配合の変更" : "抽出条件の変更";

  return (
    <div className="comparison-summary" data-section={section}>
      <div className="comparison-summary-copy">
        <span className="comparison-summary-label">比較中</span>
        <strong>{comparison.referenceLabel}</strong>
        <span>{label}：{count ? `${count}件` : "なし"}</span>
      </div>
      <button className="ghost-button comparison-detail-button" type="button" onClick={() => onOpen(section)}>
        詳細比較
      </button>
    </div>
  );
}

export function RecipeComparisonDialog({ comparison, onClose }) {
  if (!comparison) return null;

  return (
    <div className="dialog-backdrop">
      <div className="master-dialog recipe-comparison-dialog" role="dialog" aria-modal="true" aria-labelledby="recipeComparisonTitle">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Compare</p>
            <h3 id="recipeComparisonTitle">レシピの差分</h3>
            <p className="comparison-dialog-reference">参照：{comparison.referenceLabel} / 今回の入力</p>
          </div>
        </div>
        <ComparisonSection title="配合の変更" changes={comparison.blendChanges} />
        <ComparisonSection title="抽出条件の変更" changes={comparison.brewChanges} />
        <div className="button-row dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

function ComparisonSection({ title, changes }) {
  return (
    <section className="comparison-section" aria-label={title}>
      <div className="comparison-section-heading">
        <h4>{title}</h4>
        <span>{changes.length}件</span>
      </div>
      {changes.length === 0 ? (
        <p className="comparison-no-change">変更はありません</p>
      ) : (
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">項目</th>
                <th scope="col">参照</th>
                <th scope="col">今回</th>
                <th scope="col">差分</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.key} data-change={change.delta > 0 ? "increase" : change.delta < 0 ? "decrease" : "changed"}>
                  <th scope="row">{change.label}</th>
                  <td>{formatComparisonValue(change.referenceValue, change.valueType)}</td>
                  <td>{formatComparisonValue(change.currentValue, change.valueType)}</td>
                  <td>{formatDelta(change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatComparisonValue(value, valueType) {
  if (value === null || value === undefined || value === "") return "未設定";
  if (valueType === "ratio") return `${value}%`;
  if (valueType === "gram") return `${value}g`;
  if (valueType === "brewRatio") return `1:${value}`;
  if (valueType === "temperature") return `${value}℃`;
  if (valueType === "grindSize") return grindSizeLabels[value] || value;
  if (valueType === "roastLevel") return roastLevelOptions.find(([optionValue]) => optionValue === value)?.[1] || value;
  return value;
}

function formatDelta(change) {
  if (change.valueType === "ratio" && Number.isFinite(change.delta)) {
    return `${change.delta > 0 ? "+" : ""}${change.delta}pt`;
  }
  return "変更";
}

const grindSizeLabels = {
  fine: "細挽き",
  medium_fine: "中細挽き",
  medium: "中挽き",
  medium_coarse: "中粗挽き",
  coarse: "粗挽き",
};
