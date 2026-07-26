import React from "react";

const sensoryFields = [
  ["fragrance", "香り"],
  ["flavor", "風味"],
  ["aftertaste", "後味"],
  ["balance", "バランス"],
];

export function SensoryPanel({ sensory, memo, onSensoryChange, onMemoChange }) {
  return (
    <section className="panel sensory-panel" aria-labelledby="sensoryTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cupping</p>
          <h2 id="sensoryTitle">試飲の感能</h2>
        </div>
      </div>
      <div className="sensory-grid">
        {sensoryFields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input type="number" min="0" max="10" step="0.5" value={sensory[key]} onChange={(event) => onSensoryChange({ ...sensory, [key]: Number(event.target.value) || 0 })} />
          </label>
        ))}
      </div>
      <label className="memo-field">
        メモ
        <textarea rows="4" placeholder="香り、甘み、後味、改善したい点" value={memo} onChange={(event) => onMemoChange(event.target.value)} />
      </label>
    </section>
  );
}
