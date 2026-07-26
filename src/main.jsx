import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import heroImage from "../assets/coffee-blend-workbench.png";
import {
  buildBlendCost,
  buildProfile,
  calculateBeanDoseGram,
  calculateBlendTotal,
  calculatePourSchedule,
  calculateTargetBrewGram,
  getPourTotal,
  normalizeBlendRatios,
  normalizePercent,
} from "./domain/coffee/calculations.js";
import {
  createRecipeVersionData,
  createSavedRecipeBrewMethod,
  getRecipeBean,
  getRecipeBrewMethod,
  saveRecipeVersion,
  sortVersions,
} from "./domain/coffee/recipeSeries.js";
import { profileLabels, profileMetricKeys } from "./domain/coffee/profile.js";
import { getDefaultSelectedBrewMethodId } from "./domain/defaultCoffeeData.js";
import { BeanMaster, MasterSaveActions } from "./components/BeanMaster.jsx";
import { RecipeLibrary } from "./components/RecipeLibrary.jsx";
import { useCoffeeData } from "./hooks/useCoffeeData.js";
import "./styles.css";

const sensoryFields = [
  ["fragrance", "香り"],
  ["flavor", "風味"],
  ["aftertaste", "後味"],
  ["balance", "バランス"],
];

const initialSensory = { fragrance: 7, flavor: 7, aftertaste: 7, balance: 7 };

const pages = [
  ["blend", "ブレンド作成"],
  ["recipes", "レシピ一覧"],
  ["beans", "豆マスタ"],
  ["brew", "淹れ方マスタ"],
];

function confirmDeleteItem(label) {
  return window.confirm(`「${label}」を削除しますか？この操作は元に戻せません。`);
}

function emptyRatios(beans) {
  return Object.fromEntries(beans.map((bean) => [bean.id, 0]));
}

function beansWithRatios(beans, ratios) {
  return beans.map((bean) => ({
    ...bean,
    ratio: Number(ratios[bean.id]) || 0,
  }));
}

function App() {
  const [activePage, setActivePage] = useState("blend");
  const [recipeSaveMessage, setRecipeSaveMessage] = useState("");
  const [blendName, setBlendName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [doseGram, setDoseGram] = useState(20);
  const [brewRatio, setBrewRatio] = useState(16);
  const [savedRecipeBrewMethod, setSavedRecipeBrewMethod] = useState(null);
  const [editingRecipeSource, setEditingRecipeSource] = useState(null);
  const [sensory, setSensory] = useState(initialSensory);
  const [memo, setMemo] = useState("");
  const {
    beans,
    brewMethods,
    recipeSeries,
    selectedBrewMethodId,
    storageMode,
    masterSaveStatus,
    beansDirty,
    brewMethodsDirty,
    setBeans,
    setBrewMethods,
    setRecipeSeries,
    setSelectedBrewMethodId,
    saveBeansMaster,
    saveBrewMethodsMaster,
    revertBeansMaster,
    revertBrewMethodsMaster,
  } = useCoffeeData({
    savedRecipeBrewMethod,
    onBeansReplaced: (loadedBeans) => setBlendRatios(emptyRatios(loadedBeans)),
  });
  const [blendRatios, setBlendRatios] = useState(() => emptyRatios(beans));

  const recipeBeans = useMemo(
    () => beans.filter((bean) => bean.visibleInRecipes !== false || Number(blendRatios[bean.id]) > 0),
    [beans, blendRatios],
  );
  const blendBeans = useMemo(() => beansWithRatios(recipeBeans, blendRatios), [recipeBeans, blendRatios]);
  const total = useMemo(() => calculateBlendTotal(blendBeans), [blendBeans]);
  const profile = useMemo(() => buildProfile(blendBeans, total, profileMetricKeys), [blendBeans, total]);
  const targetBrewGram = calculateTargetBrewGram(doseGram, brewRatio);
  const blendCost = useMemo(() => buildBlendCost(blendBeans, total, doseGram), [blendBeans, total, doseGram]);
  const brewMethodOptions = useMemo(
    () => (savedRecipeBrewMethod ? [savedRecipeBrewMethod, ...brewMethods] : brewMethods),
    [brewMethods, savedRecipeBrewMethod],
  );
  const selectedBrewMethod = brewMethodOptions.find((method) => method.id === selectedBrewMethodId) || brewMethods[0];
  function updateRatio(id, ratio) {
    setBlendRatios((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(100, Number(ratio) || 0)),
    }));
  }

  function normalizeRatios() {
    if (!blendBeans.length) return;
    setBlendRatios(normalizeBlendRatios(blendBeans, total));
  }

  function updateMaster(id, patch) {
    setBeans((current) => current.map((bean) => (bean.id === id ? { ...bean, ...patch } : bean)));
  }

  function updateProfile(id, key, value) {
    setBeans((current) =>
      current.map((bean) =>
        bean.id === id
          ? {
              ...bean,
              profile: { ...bean.profile, [key]: Math.max(0, Math.min(100, Number(value) || 0)) },
            }
          : bean,
      ),
    );
  }

  function addBean() {
    const colors = ["#12656b", "#b85243", "#54745a", "#c38b2d", "#6a5f99"];
    const id = `bean-${Date.now()}`;
    setBeans((current) => [
      ...current,
      {
        id,
        name: "新しい豆",
        note: "特徴を入力",
        color: colors[current.length % colors.length],
        ratio: 0,
        visibleInRecipes: true,
        costPerKg: 0,
        profile: { acidity: 50, sweetness: 50, bitterness: 50, body: 50, aroma: 50 },
      },
    ]);
    setBlendRatios((current) => ({ ...current, [id]: 0 }));
  }

  function deleteBean(id) {
    if (beans.length <= 1) return;
    const bean = beans.find((item) => item.id === id);
    if (!bean || !confirmDeleteItem(bean.name)) return;
    setBeans((current) => current.filter((bean) => bean.id !== id));
    setBlendRatios((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function addBrewMethod() {
    const id = `brew-${Date.now()}`;
    setBrewMethods((current) => [
      ...current,
      {
        id,
        name: "新しい淹れ方",
        note: "抽出意図を入力",
        bloomPercent: 12,
        pour1Percent: 28,
        pour2Percent: 30,
        pour3Percent: 30,
        bloomSeconds: 30,
      },
    ]);
    setSelectedBrewMethodId(id);
  }

  function updateBrewMethod(id, patch) {
    setBrewMethods((current) => current.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  }

  function deleteBrewMethod(id) {
    if (brewMethods.length <= 1) return;
    const method = brewMethods.find((item) => item.id === id);
    if (!method || !confirmDeleteItem(method.name)) return;
    setBrewMethods((current) => {
      const next = current.filter((method) => method.id !== id);
      if (selectedBrewMethodId === id) setSelectedBrewMethodId(next[0].id);
      return next;
    });
  }

  function changeSelectedBrewMethod(id) {
    if (savedRecipeBrewMethod?.id !== id) {
      setSavedRecipeBrewMethod(null);
    }
    setSelectedBrewMethodId(id);
  }

  function saveRecipe(event) {
    event.preventDefault();
    const now = new Date().toISOString();
    const seriesIdSeed = editingRecipeSource?.seriesId ? undefined : Date.now();
    const versionIdSeed = Date.now();
    const { recipe, currentSeries } = createRecipeVersionData({
      recipeSeries,
      editingRecipeSource,
      blendName,
      changeNote,
      blendBeans,
      doseGram,
      brewRatio,
      targetBrewGram,
      blendCost,
      selectedBrewMethod,
      sensory,
      memo,
      now,
      seriesIdSeed,
      versionIdSeed,
    });
    setRecipeSeries((current) => saveRecipeVersion(current, currentSeries, recipe, now));
    setRecipeSaveMessage(`${recipe.name} v${recipe.version} を登録しました`);
    resetRecipeInput();
    window.setTimeout(() => setRecipeSaveMessage(""), 3200);
  }

  function resetRecipeInput() {
    setBlendName("");
    setChangeNote("");
    setBlendRatios(emptyRatios(beans));
    setDoseGram(20);
    setBrewRatio(16);
    setSavedRecipeBrewMethod(null);
    setEditingRecipeSource(null);
    setSelectedBrewMethodId(brewMethods[0]?.id || getDefaultSelectedBrewMethodId());
    setSensory(initialSensory);
    setMemo("");
  }

  function loadRecipe(recipe, series) {
    setBlendName(series?.name || recipe.name);
    setChangeNote("");
    setEditingRecipeSource({ seriesId: recipe.seriesId || series?.id, versionId: recipe.id });
    setDoseGram(recipe.doseGram || 20);
    setBrewRatio(recipe.brewRatio || 16);
    const savedBrewMethod = createSavedRecipeBrewMethod(recipe);
    if (savedBrewMethod) {
      setSavedRecipeBrewMethod(savedBrewMethod);
      setSelectedBrewMethodId(savedBrewMethod.id);
    } else if (recipe.brewMethodId && brewMethods.some((method) => method.id === recipe.brewMethodId)) {
      setSavedRecipeBrewMethod(null);
      setSelectedBrewMethodId(recipe.brewMethodId);
    } else {
      setSavedRecipeBrewMethod(null);
    }
    setSensory({ ...initialSensory, ...(recipe.sensory || {}) });
    setMemo(recipe.memo || "");
    setBlendRatios(Object.fromEntries(beans.map((bean) => {
      const ratio = recipe.ratios.find((item) => item.id === bean.id);
      return [bean.id, ratio ? ratio.value : 0];
    })));
    setRecipeSaveMessage("");
  }

  function archiveRecipeSeries(seriesId) {
    const series = recipeSeries.find((item) => item.id === seriesId);
    if (!series) return;
    const shouldArchive = window.confirm(`「${series.name}」をアーカイブしますか？`);
    if (!shouldArchive) return;
    setRecipeSeries((current) =>
      current.map((item) =>
        item.id === seriesId
          ? { ...item, status: "archived", updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  function restoreRecipeSeries(seriesId) {
    setRecipeSeries((current) =>
      current.map((series) =>
        series.id === seriesId
          ? { ...series, status: "active", updatedAt: new Date().toISOString() }
          : series,
      ),
    );
  }

  function deleteRecipeVersion(seriesId, versionId) {
    const series = recipeSeries.find((item) => item.id === seriesId);
    const version = series?.versions.find((item) => item.id === versionId);
    if (!series || !version || series.versions.length <= 1) return;
    if (!confirmDeleteItem(`${series.name} v${version.version}`)) return;

    setRecipeSeries((current) =>
      current.map((item) => {
        if (item.id !== seriesId) return item;

        const versions = sortVersions(item.versions.filter((recipe) => recipe.id !== versionId));
        const latest = versions[0];
        return {
          ...item,
          currentVersionId: item.currentVersionId === versionId ? latest.id : item.currentVersionId,
          updatedAt: new Date().toISOString(),
          versions,
        };
      }),
    );
  }

  function exportRecipes(format) {
    const payload = recipeSeries.flatMap((series) =>
      series.versions.map((recipe) => ({
        ...recipe,
        seriesName: series.name,
        seriesStatus: series.status,
        brewMethodSnapshot: getRecipeBrewMethod(recipe, brewMethods),
        beans: recipe.ratios.map((ratio) => {
          const bean = getRecipeBean(ratio, beans);
          return { name: bean?.name || ratio.id, ratio: ratio.value, costPerKg: bean?.costPerKg || 0 };
        }),
      })),
    );

    if (format === "json") {
      downloadFile("coffee-blend-recipes.json", JSON.stringify(payload, null, 2), "application/json");
      return;
    }

    const rows = [
      [
        "name",
        "seriesName",
        "version",
        "savedAt",
        "changeNote",
        "doseGram",
        "targetBrewGram",
        "blendCost",
        "bean",
        "ratio",
        "costPerKg",
        "brewMethod",
        "bloomPercent",
        "pour1Percent",
        "pour2Percent",
        "pour3Percent",
        "fragrance",
        "flavor",
        "aftertaste",
        "balance",
        "memo",
      ],
    ];
    payload.forEach((recipe) => {
      recipe.beans.forEach((bean) => {
        rows.push([
          recipe.name,
          recipe.seriesName,
          recipe.version || "",
          recipe.savedAt,
          recipe.changeNote || "",
          recipe.doseGram || "",
          recipe.targetBrewGram || "",
          recipe.blendCost || "",
          bean.name,
          bean.ratio,
          bean.costPerKg,
          recipe.brewMethodSnapshot?.name || "",
          recipe.brewMethodSnapshot?.bloomPercent ?? "",
          recipe.brewMethodSnapshot?.pour1Percent ?? "",
          recipe.brewMethodSnapshot?.pour2Percent ?? "",
          recipe.brewMethodSnapshot?.pour3Percent ?? "",
          recipe.sensory?.fragrance ?? "",
          recipe.sensory?.flavor ?? "",
          recipe.sensory?.aftertaste ?? "",
          recipe.sensory?.balance ?? "",
          recipe.memo || "",
        ]);
      });
    });
    downloadFile("coffee-blend-recipes.csv", rows.map(toCsvRow).join("\n"), "text/csv");
  }

  return (
    <>
      <header className="app-header">
        <div className="header-media" style={{ backgroundImage: `linear-gradient(90deg, rgba(11, 16, 17, 0.84), rgba(11, 16, 17, 0.38)), url(${heroImage})` }} />
        <div className="header-content">
          <div>
            <p className="eyebrow">Coffee Blend Studio</p>
            <h1>Blend Manager</h1>
            <p className="lead">豆の個性と比率から、配合量、抽出量、試飲結果、保存レシピまで一画面で管理します。</p>
          </div>
          <nav className="app-nav" aria-label="ページ切り替え">
            {pages.map(([id, label]) => (
              <button type="button" key={id} data-active={activePage === id} onClick={() => setActivePage(id)}>
                {label}
              </button>
            ))}
            <span className="storage-badge" data-mode={storageMode}>
              {storageMode === "sqlite" ? "SQLite" : "Local"}
            </span>
          </nav>
        </div>
      </header>

      <main className={`workspace ${activePage !== "blend" ? "single-page" : ""}`}>
        {activePage === "blend" && (
          <>
            <RecipeNamePanel blendName={blendName} changeNote={changeNote} saveMessage={recipeSaveMessage} editingRecipeSource={editingRecipeSource} onNameChange={setBlendName} onChangeNoteChange={setChangeNote} onSave={saveRecipe} />
            <BlendBuilder beans={blendBeans} total={total} onRatioChange={updateRatio} onNormalize={normalizeRatios} />
            <Dosing
              beans={blendBeans}
              total={total}
              doseGram={doseGram}
              brewRatio={brewRatio}
              targetBrewGram={targetBrewGram}
              blendCost={blendCost}
              brewMethods={brewMethods}
              brewMethodOptions={brewMethodOptions}
              selectedBrewMethod={selectedBrewMethod}
              selectedBrewMethodId={selectedBrewMethodId}
              onDoseChange={setDoseGram}
              onRatioChange={setBrewRatio}
              onMethodChange={changeSelectedBrewMethod}
            />
            <ProfilePanel profile={profile} total={total} />
            <SensoryPanel sensory={sensory} memo={memo} onSensoryChange={setSensory} onMemoChange={setMemo} />
          </>
        )}
        {activePage === "recipes" && (
          <RecipeLibrary
            recipeSeries={recipeSeries}
            beans={beans}
            brewMethods={brewMethods}
            onLoad={loadRecipe}
            onArchive={archiveRecipeSeries}
            onRestore={restoreRecipeSeries}
            onDeleteVersion={deleteRecipeVersion}
            onExport={exportRecipes}
            onLoaded={() => setActivePage("blend")}
          />
        )}
        {activePage === "beans" && <BeanMaster beans={beans} dirty={beansDirty} saveStatus={masterSaveStatus.beans} onAdd={addBean} onDelete={deleteBean} onUpdate={updateMaster} onProfileUpdate={updateProfile} onSave={saveBeansMaster} onRevert={revertBeansMaster} />}
        {activePage === "brew" && <BrewMethodMaster methods={brewMethods} dirty={brewMethodsDirty} saveStatus={masterSaveStatus.brewMethods} onAdd={addBrewMethod} onDelete={deleteBrewMethod} onUpdate={updateBrewMethod} onSave={saveBrewMethodsMaster} onRevert={revertBrewMethodsMaster} />}
      </main>
    </>
  );
}

function RecipeNamePanel({ blendName, changeNote, saveMessage, editingRecipeSource, onNameChange, onChangeNoteChange, onSave }) {
  return (
    <section className="panel recipe-name-panel" aria-labelledby="recipeNameTitle">
      <form className="recipe-name-form" onSubmit={onSave}>
        <div>
          <p className="eyebrow">Current Recipe</p>
          <h2 id="recipeNameTitle">{editingRecipeSource ? "次バージョン作成" : "新規シリーズ作成"}</h2>
        </div>
        <label>
          シリーズ名
          <input value={blendName} maxLength={28} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label>
          メモ
          <input value={changeNote} maxLength={64} onChange={(event) => onChangeNoteChange(event.target.value)} />
        </label>
        <button type="submit" title="保存">Save</button>
      </form>
      {saveMessage && <div className="save-toast" role="status">{saveMessage}</div>}
    </section>
  );
}

function BlendBuilder({ beans, total, onRatioChange, onNormalize }) {
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

function Dosing({ beans, total, doseGram, brewRatio, targetBrewGram, blendCost, brewMethodOptions, selectedBrewMethod, selectedBrewMethodId, onDoseChange, onRatioChange, onMethodChange }) {
  const pourTotal = getPourTotal(selectedBrewMethod);
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
          <input type="number" min="1" max="2000" step="1" value={doseGram} onChange={(event) => onDoseChange(Number(event.target.value) || 1)} />
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
      </div>
      <div className="dose-summary">
        <div className="dose-line"><span>目標抽出量</span><strong>{targetBrewGram} g</strong></div>
        <div className="dose-line"><span>ブレンド原価</span><strong>{blendCost.toFixed(1)} 円</strong></div>
        <div className="dose-line"><span>投湯割合合計</span><strong>{pourTotal}%</strong></div>
        {beans.filter((bean) => bean.ratio > 0).map((bean) => (
          <div className="dose-line" key={bean.id}>
            <span>{bean.name}</span>
            <strong>{calculateBeanDoseGram(bean, total, doseGram).toFixed(1)} g</strong>
          </div>
        ))}
      </div>
      <BrewSchedule method={selectedBrewMethod} targetBrewGram={targetBrewGram} />
    </section>
  );
}

function BrewSchedule({ method, targetBrewGram }) {
  if (!method) return null;

  const steps = calculatePourSchedule(method, targetBrewGram);

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

function ProfilePanel({ profile, total }) {
  const canvasRef = useRef(null);
  const dominant = profileLabels.reduce((best, current) => (profile[current[0]] > profile[best[0]] ? current : best));
  const low = profileLabels.reduce((worst, current) => (profile[current[0]] < profile[worst[0]] ? current : worst));

  useEffect(() => {
    drawProfile(canvasRef.current, profile);
  }, [profile]);

  return (
    <section className="panel result-panel" aria-labelledby="resultTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h2 id="resultTitle">味の傾向</h2>
        </div>
        <output className="total-output" data-ok={total === 100}>{total}%</output>
      </div>
      <div className="profile-grid">
        <canvas ref={canvasRef} width="420" height="300" aria-label="味覚プロファイルのレーダーチャート" />
        <div className="metrics">
          {profileLabels.map(([key, label]) => (
            <div className="metric" key={key}>
              <div className="metric-label"><span>{label}</span><span>{profile[key]}</span></div>
              <div className="meter"><span style={{ width: `${profile[key]}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="recommendation">
        いまは{dominant[1]}が前に出て、{low[1]}は控えめです。試作では中挽きから始め、香りを残したい場合は湯温を少し下げてください。
      </div>
    </section>
  );
}

function SensoryPanel({ sensory, memo, onSensoryChange, onMemoChange }) {
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

function BrewMethodMaster({ methods, dirty, saveStatus, onAdd, onDelete, onUpdate, onSave, onRevert }) {
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

function drawProfile(canvas, profile) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const radius = 102;
  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;
  context.font = "700 14px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath();
    profileLabels.forEach((_, index) => {
      const point = radarPoint(index, (radius * ring) / 4, cx, cy);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.strokeStyle = ring === 4 ? "#cfc5b7" : "#e8dfd4";
    context.stroke();
  }

  profileLabels.forEach(([, label], index) => {
    const edge = radarPoint(index, radius + 28, cx, cy);
    const axis = radarPoint(index, radius, cx, cy);
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(axis.x, axis.y);
    context.strokeStyle = "#e1d8cc";
    context.stroke();
    context.fillStyle = "#706b62";
    context.fillText(label, edge.x, edge.y);
  });

  context.beginPath();
  profileLabels.forEach(([key], index) => {
    const point = radarPoint(index, radius * (profile[key] / 100), cx, cy);
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fillStyle = "rgba(18, 101, 107, 0.2)";
  context.strokeStyle = "#12656b";
  context.lineWidth = 3;
  context.fill();
  context.stroke();
}

function radarPoint(index, distance, cx, cy) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / profileLabels.length;
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}

function toCsvRow(row) {
  return row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

createRoot(document.getElementById("root")).render(<App />);
