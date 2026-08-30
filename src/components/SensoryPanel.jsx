import React from "react";

const sensoryFields = [
  ["fragrance", "香り"],
  ["flavor", "風味"],
  ["aftertaste", "後味"],
  ["balance", "バランス"],
];

export function SensoryPanel({ sensory, memo, changeNote = "", onSensoryChange, onMemoChange, onChangeNote = () => {} }) {
  return (
    <section className="panel sensory-panel" aria-labelledby="sensoryTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cupping</p>
          <h2 id="sensoryTitle">試飲の記録</h2>
        </div>
      </div>
      <label className="change-note-field">
        このバージョンで変更したこと
        <textarea
          rows="3"
          maxLength="240"
          placeholder="例：ブラジルを40%から50%に増やした"
          value={changeNote}
          onChange={(event) => onChangeNote(event.target.value)}
        />
        <span className="change-note-count">{changeNote.length} / 240</span>
      </label>
      <div className="sensory-grid">
        {sensoryFields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input type="number" min="0" max="10" step="0.5" value={sensory[key]} onChange={(event) => onSensoryChange({ ...sensory, [key]: Number(event.target.value) || 0 })} />
          </label>
        ))}
      </div>
      <label className="memo-field">
        試飲メモ
        <textarea rows="4" placeholder="味の印象、気づき、次に試したいこと" value={memo} onChange={(event) => onMemoChange(event.target.value)} />
      </label>
    </section>
  );
}
