import React, { useEffect, useState } from "react";

export function Dosing({
  doseGram,
  brewRatio,
  grindSize,
  brewTemperatureC,
  targetBrewGram,
  blendCost,
  pourTotal,
  beanDoseLines,
  brewSchedule,
  showBrewSchedule,
  brewMethodOptions,
  selectedBrewMethodId,
  onDoseChange,
  onRatioChange,
  onGrindSizeChange,
  onBrewTemperatureChange,
  onMethodChange,
}) {
  const [doseInputValue, setDoseInputValue] = useState(String(doseGram));

  useEffect(() => {
    setDoseInputValue(String(doseGram));
  }, [doseGram]);

  function changeDoseInput(value) {
    setDoseInputValue(value);
    if (value === "") return;

    const nextDose = Number(value);
    if (!Number.isFinite(nextDose)) return;

    onDoseChange(nextDose);
  }

  function commitDoseInput() {
    const nextDose = Number(doseInputValue);
    if (doseInputValue !== "" && Number.isFinite(nextDose) && nextDose > 0) return;

    const fallbackDose = Number(doseGram) > 0 ? doseGram : 20;
    setDoseInputValue(String(fallbackDose));
    onDoseChange(fallbackDose);
  }

  return (
    <section className="panel dosing-panel" aria-labelledby="dosingTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dose</p>
          <h2 id="dosingTitle">g指定と抽出量</h2>
        </div>
      </div>
      <div className="control-grid">
        <label>
          コーヒー粉量 g
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max="2000"
            step="1"
            value={doseInputValue}
            onChange={(event) => changeDoseInput(event.target.value)}
            onBlur={commitDoseInput}
          />
        </label>
        <label>
          抽出比率
          <select value={brewRatio} onChange={(event) => onRatioChange(Number(event.target.value))}>
            <option value="11">1:11 水出し濃いめ</option>
            <option value="12">1:12 水出し標準</option>
            <option value="14">1:14 濃いめ</option>
            <option value="15">1:15 バランス</option>
            <option value="16">1:16 標準</option>
            <option value="17">1:17 すっきり</option>
          </select>
        </label>
        <label>
          淹れ方
          <select value={selectedBrewMethodId} onChange={(event) => onMethodChange(event.target.value)}>
            {brewMethodOptions.map((method) => (
              <option value={method.id} key={method.id}>{method.displayName || method.name}</option>
            ))}
          </select>
        </label>
        <label>
          挽き目
          <select value={grindSize} onChange={(event) => onGrindSizeChange(event.target.value)}>
            <option value="">未設定</option>
            <option value="fine">細挽き</option>
            <option value="medium_fine">中細挽き</option>
            <option value="medium">中挽き</option>
            <option value="medium_coarse">中粗挽き</option>
            <option value="coarse">粗挽き</option>
          </select>
        </label>
        <label>
          湯温 ℃
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="1"
            placeholder="未設定"
            value={brewTemperatureC}
            onChange={(event) => onBrewTemperatureChange(event.target.value === "" ? "" : Number(event.target.value))}
          />
        </label>
      </div>
      <div className="dose-summary">
        <div className="dose-line"><span>目標抽出量</span><strong>{targetBrewGram} g</strong></div>
        <div className="dose-line"><span>ブレンド原価</span><strong>{blendCost.toFixed(1)} 円</strong></div>
        <div className="dose-line"><span>投湯割合合計</span><strong>{pourTotal}%</strong></div>
        {beanDoseLines.map((bean) => (
          <div className="dose-line" key={bean.id}>
            <span>{bean.name}</span>
            <strong>{bean.doseGram.toFixed(1)} g</strong>
          </div>
        ))}
      </div>
      {showBrewSchedule && <BrewSchedule steps={brewSchedule} />}
    </section>
  );
}

function BrewSchedule({ steps }) {
  return (
    <div className="brew-schedule">
      {steps.map(({ label, percent, sub, stepGram, cumulativeGram }) => (
        <div className="brew-step" key={label}>
          <span>{label}</span>
          <strong>{cumulativeGram} g</strong>
          <small>+{stepGram} g / {percent}% {sub}</small>
        </div>
      ))}
    </div>
  );
}
