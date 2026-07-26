import React, { useMemo, useState } from "react";
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
} from "./domain/coffee/calculations.js";
import {
  archiveRecipeSeriesData,
  createSavedRecipeBrewMethod,
  deleteRecipeVersionData,
  restoreRecipeSeriesData,
  saveRecipeData,
} from "./domain/coffee/recipeSeries.js";
import { buildRecipeExportFile } from "./domain/recipe/recipeExport.js";
import { profileMetricKeys } from "./domain/coffee/profile.js";
import { getDefaultSelectedBrewMethodId } from "./domain/defaultCoffeeData.js";
import { BeanMaster } from "./components/BeanMaster.jsx";
import { BlendBuilder } from "./components/BlendBuilder.jsx";
import { BrewMethodMaster } from "./components/BrewMethodMaster.jsx";
import { Dosing } from "./components/Dosing.jsx";
import { ProfilePanel } from "./components/ProfilePanel.jsx";
import { RecipeLibrary } from "./components/RecipeLibrary.jsx";
import { RecipeNamePanel } from "./components/RecipeNamePanel.jsx";
import { SensoryPanel } from "./components/SensoryPanel.jsx";
import { useCoffeeData } from "./hooks/useCoffeeData.js";
import { initialSensory, useRecipeEditor } from "./hooks/useRecipeEditor.js";
import { downloadFile } from "./services/downloadFile.js";
import "./styles.css";

const pages = [
  ["blend", "ブレンド作成"],
  ["recipes", "レシピ一覧"],
  ["beans", "豆マスタ"],
  ["brew", "淹れ方マスタ"],
];

function confirmDeleteItem(label) {
  return window.confirm(`「${label}」を削除しますか？この操作は元に戻せません。`);
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
  const editor = useRecipeEditor();
  const {
    blendName,
    setBlendName,
    changeNote,
    setChangeNote,
    doseGram,
    setDoseGram,
    brewRatio,
    setBrewRatio,
    savedRecipeBrewMethod,
    editingRecipeSource,
    sensory,
    setSensory,
    memo,
    setMemo,
    blendRatios,
    setBlendRatios,
    updateRatio,
    normalizeRatios,
    resetEditor,
    replaceEditorState,
    replaceBlendRatiosForBeans,
    clearSavedRecipeBrewMethodIfDifferent,
  } = editor;
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
    onBeansReplaced: replaceBlendRatiosForBeans,
  });

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
  const pourTotal = useMemo(() => getPourTotal(selectedBrewMethod), [selectedBrewMethod]);
  const brewSchedule = useMemo(
    () => calculatePourSchedule(selectedBrewMethod, targetBrewGram),
    [selectedBrewMethod, targetBrewGram],
  );
  const beanDoseLines = useMemo(
    () =>
      blendBeans
        .filter((bean) => bean.ratio > 0)
        .map((bean) => ({
          id: bean.id,
          name: bean.name,
          doseGram: calculateBeanDoseGram(bean, total, doseGram),
        })),
    [blendBeans, total, doseGram],
  );
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
    clearSavedRecipeBrewMethodIfDifferent(id);
    setSelectedBrewMethodId(id);
  }

  function saveRecipe(event) {
    event.preventDefault();
    const now = new Date().toISOString();
    const seriesIdSeed = editingRecipeSource?.seriesId ? undefined : Date.now();
    const versionIdSeed = Date.now();
    const result = saveRecipeData({
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
    setRecipeSeries(result.recipeSeries);
    setRecipeSaveMessage(`${result.recipe.name} v${result.recipe.version} を登録しました`);
    resetRecipeInput();
    window.setTimeout(() => setRecipeSaveMessage(""), 3200);
  }

  function resetRecipeInput() {
    resetEditor(beans);
    setSelectedBrewMethodId(brewMethods[0]?.id || getDefaultSelectedBrewMethodId());
  }

  function loadRecipe(recipe, series) {
    const savedBrewMethod = createSavedRecipeBrewMethod(recipe);
    if (savedBrewMethod) {
      setSelectedBrewMethodId(savedBrewMethod.id);
    } else if (recipe.brewMethodId && brewMethods.some((method) => method.id === recipe.brewMethodId)) {
      setSelectedBrewMethodId(recipe.brewMethodId);
    }
    replaceEditorState({
      blendName: series?.name || recipe.name,
      changeNote: "",
      editingRecipeSource: { seriesId: recipe.seriesId || series?.id, versionId: recipe.id },
      doseGram: recipe.doseGram || 20,
      brewRatio: recipe.brewRatio || 16,
      savedRecipeBrewMethod: savedBrewMethod,
      sensory: { ...initialSensory, ...(recipe.sensory || {}) },
      memo: recipe.memo || "",
      blendRatios: Object.fromEntries(beans.map((bean) => {
        const ratio = recipe.ratios.find((item) => item.id === bean.id);
        return [bean.id, ratio ? ratio.value : 0];
      })),
    });
    setRecipeSaveMessage("");
  }

  function archiveRecipeSeries(seriesId) {
    const series = recipeSeries.find((item) => item.id === seriesId);
    if (!series) return;
    const shouldArchive = window.confirm(`「${series.name}」をアーカイブしますか？`);
    if (!shouldArchive) return;
    setRecipeSeries((current) => archiveRecipeSeriesData(current, seriesId, new Date().toISOString()));
  }

  function restoreRecipeSeries(seriesId) {
    setRecipeSeries((current) => restoreRecipeSeriesData(current, seriesId, new Date().toISOString()));
  }

  function deleteRecipeVersion(seriesId, versionId) {
    const series = recipeSeries.find((item) => item.id === seriesId);
    const version = series?.versions.find((item) => item.id === versionId);
    if (!series || !version || series.versions.length <= 1) return;
    if (!confirmDeleteItem(`${series.name} v${version.version}`)) return;

    setRecipeSeries((current) => deleteRecipeVersionData(current, seriesId, versionId, new Date().toISOString()));
  }

  function exportRecipes(format) {
    downloadFile(buildRecipeExportFile({ format, recipeSeries, beans, brewMethods }));
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
            <BlendBuilder beans={blendBeans} total={total} onRatioChange={updateRatio} onNormalize={() => normalizeRatios(blendBeans, total)} />
            <Dosing
              doseGram={doseGram}
              brewRatio={brewRatio}
              targetBrewGram={targetBrewGram}
              blendCost={blendCost}
              pourTotal={pourTotal}
              beanDoseLines={beanDoseLines}
              brewSchedule={brewSchedule}
              showBrewSchedule={Boolean(selectedBrewMethod)}
              brewMethodOptions={brewMethodOptions}
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

createRoot(document.getElementById("root")).render(<App />);
