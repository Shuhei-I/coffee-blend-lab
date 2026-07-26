import React from "react";
import { getPourTotal, normalizePercent } from "../domain/coffee/calculations.js";
import { MasterSaveActions } from "./BeanMaster.jsx";

export function BrewMethodMaster({ methods, dirty, saveStatus, onAdd, onDelete, onUpdate, onSave, onRevert }) {
  return (
    <section className="panel brew-master-panel" aria-labelledby="brewMasterTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Brew Master</p>
          <h2 id="brewMasterTitle">淹れ方マスタ</h2>
        </div>
        <button className="ghost-button" type="button" title="淹れ方を追加" onClick={onAdd}>Add</button>
      </div>
      <MasterSaveActions dirty={dirty} status={saveStatus} onSave={onSave} onRevert={onRevert} />
      <div className="brew-master-list">
        {methods.map((method) => (
          <article className="brew-master-row" key={method.id}>
            <label>名称<input value={method.name} onChange={(event) => onUpdate(method.id, { name: event.target.value })} /></label>
            <label>メモ<input value={method.note} onChange={(event) => onUpdate(method.id, { note: event.target.value })} /></label>
            <label>蒸らし %<input type="number" min="0" max="100" step="1" value={method.bloomPercent} onChange={(event) => onUpdate(method.id, { bloomPercent: normalizePercent(event.target.value) })} /></label>
            <label>蒸らし 秒<input type="number" min="0" step="5" value={method.bloomSeconds} onChange={(event) => onUpdate(method.id, { bloomSeconds: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label>1投目 %<input type="number" min="0" max="100" step="1" value={method.pour1Percent} onChange={(event) => onUpdate(method.id, { pour1Percent: normalizePercent(event.target.value) })} /></label>
            <label>2投目 %<input type="number" min="0" max="100" step="1" value={method.pour2Percent} onChange={(event) => onUpdate(method.id, { pour2Percent: normalizePercent(event.target.value) })} /></label>
            <label>3投目 %<input type="number" min="0" max="100" step="1" value={method.pour3Percent} onChange={(event) => onUpdate(method.id, { pour3Percent: normalizePercent(event.target.value) })} /></label>
            <div className="brew-total" data-ok={getPourTotal(method) === 100}>{getPourTotal(method)}%</div>
            <button className="delete-bean" type="button" title="淹れ方を削除" onClick={() => onDelete(method.id)}>Delete</button>
          </article>
        ))}
      </div>
    </section>
  );
}
