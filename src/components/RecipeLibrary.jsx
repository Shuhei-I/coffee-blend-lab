import React, { useState } from "react";
import { getPourTotal } from "../domain/coffee/calculations.js";
import { getLatestVersion, getRecipeBean, getRecipeBrewMethod } from "../domain/coffee/recipeSeries.js";

export function RecipeLibrary({ recipeSeries, beans, brewMethods, onLoad, onArchive, onRestore, onDeleteVersion, onExport, onLoaded }) {
  const [showArchived, setShowArchived] = useState(false);
  const [expandedSeriesIds, setExpandedSeriesIds] = useState(() => new Set());
  const visibleSeries = recipeSeries.filter((series) => showArchived || series.status !== "archived");
  const archivedCount = recipeSeries.filter((series) => series.status === "archived").length;

  function handleLoad(recipe, series) {
    onLoad(recipe, series);
    onLoaded?.();
  }

  function toggleSeries(seriesId) {
    setExpandedSeriesIds((current) => {
      const next = new Set(current);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  }

  return (
    <section className="panel library-panel" aria-labelledby="libraryTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recipes</p>
          <h2 id="libraryTitle">レシピ</h2>
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" title="アーカイブ済みの表示を切り替える" aria-pressed={showArchived} onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? "Hide archived" : `Archived${archivedCount ? ` ${archivedCount}` : ""}`}
          </button>
          <button className="ghost-button" type="button" title="JSONで出力" onClick={() => onExport("json")}>JSON</button>
          <button className="ghost-button" type="button" title="CSVで出力" onClick={() => onExport("csv")}>CSV</button>
        </div>
      </div>
      <div className="recipe-list">
        {recipeSeries.length === 0 ? (
          <p className="empty-state">保存したブレンドシリーズがここに並びます。比率を決めたら Save を押してください。</p>
        ) : visibleSeries.length === 0 ? (
          <p className="empty-state">表示中のレシピはありません。Archived を押すとアーカイブ済みを確認できます。</p>
        ) : (
          visibleSeries.map((series) => {
            const latest = getLatestVersion(series);
            const brewMethod = latest ? getRecipeBrewMethod(latest, brewMethods) : null;
            const archived = series.status === "archived";
            const expanded = expandedSeriesIds.has(series.id);

            return (
              <article className="recipe-series-item" data-archived={archived} key={series.id}>
                <div className="recipe-series-head">
                  <div className="recipe-series-summary">
                    <button
                      className="toggle-versions-button"
                      type="button"
                      title={expanded ? "バージョン一覧を閉じる" : "バージョン一覧を開く"}
                      aria-label={expanded ? "バージョン一覧を閉じる" : `バージョン一覧を開く。${series.versions.length}件あります。`}
                      aria-expanded={expanded}
                      onClick={() => toggleSeries(series.id)}
                    />
                    <div>
                      <strong>{series.name}{archived && <span className="status-pill">Archived</span>}</strong>
                      {series.goal && <span className="recipe-series-goal">{series.goal}</span>}
                      {latest && <span className="recipe-latest-summary">{summarizeRecipe(latest, beans)} / v{latest.version}</span>}
                      {brewMethod && <span className="recipe-brew-method recipe-latest-summary">{summarizeBrewMethod(brewMethod)}</span>}
                    </div>
                  </div>
                  <div className="recipe-actions">
                    {latest && <button type="button" title="最新版を読み込む" onClick={() => handleLoad(latest, series)}>Latest</button>}
                    {archived ? (
                      <button className="restore-button" type="button" title="アーカイブから戻す" onClick={() => onRestore(series.id)}>Restore</button>
                    ) : (
                      <button className="archive-button" type="button" title="このシリーズをアーカイブ" onClick={() => onArchive(series.id)}>Archive</button>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="version-list">
                    {series.versions.map((recipe) => (
                      <div className="version-row" key={recipe.id}>
                        <div>
                          <strong>v{recipe.version}</strong>
                          <span>{recipe.memo || "試飲メモなし"}</span>
                          <span className="version-detail-summary"><b>配合</b>{summarizeRecipe(recipe, beans)}</span>
                          {getRecipeBrewMethod(recipe, brewMethods) && (
                            <span className="version-detail-summary">
                              <b>抽出</b>{summarizeBrewMethod(getRecipeBrewMethod(recipe, brewMethods))}
                            </span>
                          )}
                          <small>{formatSavedAt(recipe.savedAt)}</small>
                        </div>
                        <div className="recipe-actions">
                          <button type="button" title="このバージョンを読み込む" onClick={() => handleLoad(recipe, series)}>Load</button>
                          <button
                            className="danger-button"
                            type="button"
                            title={series.versions.length <= 1 ? "最後のバージョンは削除できません。シリーズをアーカイブしてください。" : "このバージョンを削除"}
                            disabled={series.versions.length <= 1}
                            onClick={() => onDeleteVersion(series.id, recipe.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function summarizeBrewMethod(method) {
  return `${method.name} / 蒸らし${method.bloomPercent}% ${method.bloomSeconds}秒 / ${getPourTotal(method)}%`;
}

function formatSavedAt(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function summarizeRecipe(recipe, beans) {
  return recipe.ratios
    .map((ratio) => {
      const bean = getRecipeBean(ratio, beans);
      return `${bean ? bean.name.split(" ")[0] : ratio.id} ${ratio.value}%`;
    })
    .join(" / ");
}
