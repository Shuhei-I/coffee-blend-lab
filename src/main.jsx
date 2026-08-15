import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import logoImage from "../assets/cbl-logo.png";
import {
  buildBlendCost,
  buildProfile,
  calculateBeanDoseGram,
  calculateBlendTotal,
  calculatePourSchedule,
  calculateTargetBrewGram,
  getPourTotal,
} from "./domain/coffee/calculations.js";
import { createRecipeVersionData, resolvePersistedBrewMethodId, validateRecipeSaveInput } from "./domain/coffee/recipeSeries.js";
import { buildRecipeEditorState } from "./domain/coffee/recipeLoad.js";
import { buildRecipeExportFile } from "./domain/recipe/recipeExport.js";
import { canDeleteBean, createBean } from "./domain/coffee/beanMaster.js";
import {
  canDeleteBrewMethod,
  createBrewMethod,
  deleteBrewMethodData,
} from "./domain/coffee/brewMethodMaster.js";
import { profileMetricKeys } from "./domain/coffee/profile.js";
import { getDefaultSelectedBrewMethodId } from "./domain/defaultCoffeeData.js";
import { AuthGate } from "./components/AuthGate.jsx";
import { AccountPanel } from "./components/AccountPanel.jsx";
import { BeanMaster } from "./components/BeanMaster.jsx";
import { BlendBuilder } from "./components/BlendBuilder.jsx";
import { BrewMethodMaster } from "./components/BrewMethodMaster.jsx";
import { BrewStopwatch } from "./components/BrewStopwatch.jsx";
import { Dosing } from "./components/Dosing.jsx";
import { ProfilePanel } from "./components/ProfilePanel.jsx";
import { ProfileSettingsPanel } from "./components/ProfileSettingsPanel.jsx";
import { RecipeLibrary } from "./components/RecipeLibrary.jsx";
import { RecipeNamePanel } from "./components/RecipeNamePanel.jsx";
import { SensoryPanel } from "./components/SensoryPanel.jsx";
import { isLegalPage, LegalPage } from "./components/LegalPages.jsx";
import { WorkspaceStatus } from "./components/WorkspaceStatus.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useCoffeeData } from "./hooks/useCoffeeData.js";
import { useProfile } from "./hooks/useProfile.js";
import { useRecipeEditor } from "./hooks/useRecipeEditor.js";
import { downloadFile } from "./services/downloadFile.js";
import "./styles.css";

const pages = [
  ["blend", "配合"],
  ["brew", "抽出"],
  ["record", "記録"],
  ["history", "履歴"],
  ["manage", "管理"],
];

function confirmDeleteItem(label) {
  return window.confirm(`「${label}」を削除しますか？この操作は元に戻せません。`);
}

function beansWithRatios(beans, ratios, roastLevels) {
  return beans.map((bean) => ({
    ...bean,
    ratio: Number(ratios[bean.id]) || 0,
    roastLevel: (roastLevels || {})[bean.id] || "",
  }));
}

function App({ authUser, authError, onSignOut }) {
  const [activePage, setActivePage] = useState("blend");
  const [recipeSaveMessage, setRecipeSaveMessage] = useState("");
  const editor = useRecipeEditor();
  const profileState = useProfile();
  const {
    blendName,
    setBlendName,
    blendGoal,
    setBlendGoal,
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
    blendRoastLevels,
    setBlendRoastLevels,
    selectedBlendBeanIds,
    updateRatio,
    updateRoastLevel,
    selectBlendBean,
    removeBlendBean,
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
    loading,
    loadError,
    saveError,
    masterSaveStatus,
    setSelectedBrewMethodId,
    saveSelectedBrewMethodId,
    saveRecipeVersion: saveRecipeVersionToSupabase,
    archiveRecipeSeries: archiveRecipeSeriesInSupabase,
    restoreRecipeSeries: restoreRecipeSeriesInSupabase,
    deleteRecipeVersion: deleteRecipeVersionInSupabase,
    createBeanMaster,
    updateBeanMaster,
    deleteBeanMaster,
    createBrewMethodMaster,
    updateBrewMethodMaster,
    deleteBrewMethodMaster,
  } = useCoffeeData({
    savedRecipeBrewMethod,
    onBeansReplaced: replaceBlendRatiosForBeans,
  });

  const recipeBeanIds = useMemo(() => new Set(selectedBlendBeanIds), [selectedBlendBeanIds]);
  const recipeBeans = useMemo(
    () => beans.filter((bean) => recipeBeanIds.has(bean.id) || Number(blendRatios[bean.id]) > 0),
    [beans, blendRatios, recipeBeanIds],
  );
  const blendBeans = useMemo(
    () => beansWithRatios(recipeBeans, blendRatios, blendRoastLevels),
    [recipeBeans, blendRatios, blendRoastLevels],
  );
  const availableBlendBeans = useMemo(
    () =>
      beans
        .filter((bean) => bean.visibleInRecipes !== false)
        .filter((bean) => !recipeBeanIds.has(bean.id) && Number(blendRatios[bean.id]) <= 0),
    [beans, blendRatios, recipeBeanIds],
  );
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
  const recipeSaveValidation = useMemo(
    () => validateRecipeSaveInput({ blendBeans, total, doseGram, brewRatio }),
    [blendBeans, total, doseGram, brewRatio],
  );
  async function addBean(draft = {}) {
    const id = createClientId();
    const savedBean = await createBeanMaster({ ...createBean({ id, index: beans.length }), ...draft });
    if (!savedBean) return false;
    setBlendRatios((current) => ({ ...current, [savedBean.id]: 0 }));
    setBlendRoastLevels((current) => ({ ...current, [savedBean.id]: "" }));
    return true;
  }

  async function saveBean(bean) {
    const savedBean = await updateBeanMaster(bean);
    return Boolean(savedBean);
  }

  async function deleteBean(id) {
    if (!canDeleteBean(beans)) return;
    const bean = beans.find((item) => item.id === id);
    if (!bean || !confirmDeleteItem(bean.name)) return;
    const deleted = await deleteBeanMaster(id);
    if (!deleted) return;
    removeBlendBean(id);
    setBlendRatios((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setBlendRoastLevels((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function addBrewMethod(draft = {}) {
    const id = createClientId();
    const savedBrewMethod = await createBrewMethodMaster({ ...createBrewMethod({ id }), ...draft });
    if (!savedBrewMethod) return false;
    await saveSelectedBrewMethodId(savedBrewMethod.id);
    return true;
  }

  async function saveBrewMethod(method) {
    const savedBrewMethod = await updateBrewMethodMaster(method);
    return Boolean(savedBrewMethod);
  }

  async function deleteBrewMethod(id) {
    if (!canDeleteBrewMethod(brewMethods)) return;
    const method = brewMethods.find((item) => item.id === id);
    if (!method || !confirmDeleteItem(method.name)) return;
    const result = deleteBrewMethodData({ methods: brewMethods, methodId: id, selectedBrewMethodId });
    const deleted = await deleteBrewMethodMaster(id);
    if (!deleted) return;
    if (selectedBrewMethodId === id) await saveSelectedBrewMethodId(result.selectedBrewMethodId);
  }

  async function changeSelectedBrewMethod(id) {
    const saved = await saveSelectedBrewMethodId(id);
    if (saved) clearSavedRecipeBrewMethodIfDifferent(id);
  }

  async function saveRecipe(event) {
    event?.preventDefault?.();
    if (!recipeSaveValidation.valid) {
      setRecipeSaveMessage(recipeSaveValidation.reason);
      return;
    }

    const now = new Date().toISOString();
    const { recipe } = createRecipeVersionData({
      recipeSeries,
      editingRecipeSource,
      blendName,
      blendGoal,
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
      seriesIdSeed: Date.now(),
      versionIdSeed: Date.now(),
      persistedBrewMethodId: resolvePersistedBrewMethodId({
        selectedBrewMethodId,
        sourceBrewMethodId: selectedBrewMethod?.sourceBrewMethodId,
        brewMethods,
      }),
    });
    const updatedRecipeSeries = await saveRecipeVersionToSupabase({
      ...recipe,
      seriesId: editingRecipeSource?.seriesId || null,
      seriesName: recipe.name,
    });
    if (!updatedRecipeSeries) return;
    const savedSeries =
      (editingRecipeSource?.seriesId && updatedRecipeSeries.find((series) => series.id === editingRecipeSource.seriesId)) ||
      updatedRecipeSeries[0];
    const savedRecipe = savedSeries?.versions[0];
    setRecipeSaveMessage(`${savedRecipe?.name || blendName.trim()} v${savedRecipe?.version || ""} を登録しました`);
    resetRecipeInput();
    window.setTimeout(() => setRecipeSaveMessage(""), 3200);
  }

  function resetRecipeInput() {
    resetEditor(beans);
    setSelectedBrewMethodId(brewMethods[0]?.id || getDefaultSelectedBrewMethodId());
  }

  function resetWorkflowInput() {
    if (!window.confirm("現在の入力をリセットしますか？")) return;
    resetRecipeInput();
    setRecipeSaveMessage("");
    setActivePage("blend");
  }

  function loadRecipe(recipe, series) {
    const loadedRecipe = buildRecipeEditorState({ recipe, series, beans, brewMethods });
    if (loadedRecipe.selectedBrewMethodId) {
      setSelectedBrewMethodId(loadedRecipe.selectedBrewMethodId);
    }
    replaceEditorState(loadedRecipe.editorState);
    setRecipeSaveMessage("");
  }

  async function archiveRecipeSeries(seriesId) {
    const series = recipeSeries.find((item) => item.id === seriesId);
    if (!series) return;
    const shouldArchive = window.confirm(`「${series.name}」をアーカイブしますか？`);
    if (!shouldArchive) return;
    await archiveRecipeSeriesInSupabase(seriesId);
  }

  async function restoreRecipeSeries(seriesId) {
    await restoreRecipeSeriesInSupabase(seriesId);
  }

  async function deleteRecipeVersion(seriesId, versionId) {
    const series = recipeSeries.find((item) => item.id === seriesId);
    const version = series?.versions.find((item) => item.id === versionId);
    if (!series || !version || series.versions.length <= 1) return;
    if (!confirmDeleteItem(`${series.name} v${version.version}`)) return;

    await deleteRecipeVersionInSupabase({ seriesId, versionId });
  }

  function exportRecipes(format) {
    downloadFile(buildRecipeExportFile({ format, recipeSeries, beans, brewMethods }));
  }

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="brand-area">
            <img className="brand-logo" src={logoImage} alt="Coffee Blend Lab" />
          </div>
          {authError && (
            <p className="auth-inline-error" role="alert">
              {authError}
            </p>
          )}
        </div>
      </header>

      <nav className="app-nav" aria-label="ページ切り替え">
        {pages.map(([id, label]) => (
          <button type="button" key={id} data-active={activePage === id} onClick={() => setActivePage(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main className={`workspace ${activePage !== "blend" ? "single-page" : ""}`}>
        <WorkspaceStatus loading={loading} loadError={loadError} saveError={saveError} />
        {isLegalPage(activePage) && <LegalPage page={activePage} onBack={() => setActivePage("manage")} />}
        {activePage === "blend" && (
          <>
            <BlendBuilder
              beans={blendBeans}
              availableBeans={availableBlendBeans}
              total={total}
              onAddBean={selectBlendBean}
              onRemoveBean={removeBlendBean}
              onRatioChange={updateRatio}
              onRoastLevelChange={updateRoastLevel}
              onNormalize={() => normalizeRatios(blendBeans, total)}
            />
            <ProfilePanel profile={profile} total={total} />
            <WorkflowPageActions onReset={resetWorkflowInput} onNext={() => setActivePage("brew")} />
          </>
        )}
        {activePage === "brew" && (
          <>
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
            <BrewStopwatch />
            <WorkflowPageActions onReset={resetWorkflowInput} onNext={() => setActivePage("record")} />
          </>
        )}
        {activePage === "record" && (
          <>
            <RecipeNamePanel
              blendName={blendName}
              blendGoal={blendGoal}
              editingRecipeSource={editingRecipeSource}
              onNameChange={setBlendName}
              onBlendGoalChange={setBlendGoal}
            />
            <SensoryPanel sensory={sensory} memo={memo} onSensoryChange={setSensory} onMemoChange={setMemo} />
            <RecordSaveAction
              disabled={!recipeSaveValidation.valid}
              disabledReason={recipeSaveValidation.reason}
              saveMessage={recipeSaveMessage}
              onSave={saveRecipe}
            />
          </>
        )}
        {activePage === "history" && (
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
        {activePage === "manage" && (
          <>
            <BeanMaster beans={beans} saveStatus={masterSaveStatus.beans} onAdd={addBean} onDelete={deleteBean} onSave={saveBean} />
            <BrewMethodMaster methods={brewMethods} saveStatus={masterSaveStatus.brewMethods} onAdd={addBrewMethod} onDelete={deleteBrewMethod} onSave={saveBrewMethod} />
            <ProfileSettingsPanel
              profile={profileState.profile}
              loading={profileState.loading}
              loadError={profileState.loadError}
              saveError={profileState.saveError}
              saveStatus={profileState.saveStatus}
              onSave={profileState.saveProfile}
            />
            <AccountPanel email={authUser?.email} onOpenLegalPage={setActivePage} onSignOut={onSignOut} />
          </>
        )}
      </main>
    </>
  );
}

function WorkflowPageActions({ onReset, onNext }) {
  return (
    <div className="page-action-row">
      <button className="reset-page-button" type="button" onClick={onReset}>
        リセット
      </button>
      <button className="next-page-button" type="button" onClick={onNext}>
        次へ
      </button>
    </div>
  );
}

function RecordSaveAction({ disabled, disabledReason, saveMessage, onSave }) {
  return (
    <div className="record-save-action">
      {disabled && disabledReason && (
        <p className="inline-warning" role="status">{disabledReason}</p>
      )}
      <button className="save-page-button" type="button" title={disabledReason || "保存"} disabled={disabled} onClick={onSave}>
        保存
      </button>
      {saveMessage && <div className="save-toast" role="status">{saveMessage}</div>}
    </div>
  );
}

function createClientId() {
  return globalThis.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, "0")}`;
}

function Root() {
  const auth = useAuth();

  return (
    <AuthGate auth={auth}>
      <App authUser={auth.user} authError={auth.error} onSignOut={auth.signOut} />
    </AuthGate>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
