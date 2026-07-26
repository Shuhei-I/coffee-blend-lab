import React from "react";
import { roastLevelOptions } from "../domain/coffee/roast.js";

export function BlendBuilder({ beans, total, onRatioChange, onRoastLevelChange = () => {}, onNormalize }) {
  return (
    <section className="panel builder-panel" aria-labelledby="builderTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Blend Builder</p>
          <h2 id="builderTitle">配合</h2>
        </div>
        <button className="ghost-button" type="button" title="合計を100%に調整" disabled={!beans.length} onClick={onNormalize}>100%</button>
      </div>
      <div className="bean-list">
        {beans.length === 0 ? (
          <p className="empty-state">レシピ表示がONの豆はありません。</p>
        ) : beans.map((bean) => (
          <article className="bean-item" key={bean.id}>
            <div className="bean-top">
              <span className="swatch" style={{ background: bean.color }} />
              <div>
                <p className="bean-name">
                  {bean.name}
                  {bean.visibleInRecipes === false && <span className="status-pill">非表示中</span>}
                </p>
                <p className="bean-note" title={bean.note}>{bean.note}</p>
                <label>
                  焙煎度
                  <select value={bean.roastLevel || ""} onChange={(event) => onRoastLevelChange(bean.id, event.target.value)}>
                    {roastLevelOptions.map(([value, label]) => (
                      <option key={value || "unset"} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <output className="ratio-output">{bean.ratio ? `${bean.ratio}%` : ""}</output>
            </div>
            <div className="slider-row">
              <button className="ratio-button" type="button" title="5%減らす" onClick={() => onRatioChange(bean.id, bean.ratio - 5)}>-</button>
              <input type="range" min="0" max="100" step="5" value={bean.ratio} aria-label={`${bean.name}の比率`} onChange={(event) => onRatioChange(bean.id, event.target.value)} />
              <button className="ratio-button" type="button" title="5%増やす" onClick={() => onRatioChange(bean.id, bean.ratio + 5)}>+</button>
            </div>
          </article>
        ))}
      </div>
      {total > 0 && total !== 100 && <p className="inline-warning">合計は{total}%です。100%に正規化できます。</p>}
    </section>
  );
}
