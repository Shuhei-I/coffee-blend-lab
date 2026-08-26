import React, { useState } from "react";
import { getPourTotal } from "../domain/coffee/calculations.js";
import { getLatestVersion, getRecipeBean, getRecipeBrewMethod } from "../domain/coffee/recipeSeries.js";

export function RecipeLibrary({
  recipeSeries,
  beans,
  brewMethods,
  publicationsByVersionId = {},
  publicationLoading = false,
  publicationLoadError = null,
  publicationSaveError = null,
  publishingVersionId = null,
  onLoad,
  onArchive,
  onRestore,
  onDeleteVersion,
  onSavePublication,
  onExport,
  onLoaded,
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [expandedSeriesIds, setExpandedSeriesIds] = useState(() => new Set());
  const [publicationTarget, setPublicationTarget] = useState(null);
  const [publicationNotice, setPublicationNotice] = useState("");
  const visibleSeries = recipeSeries.filter((series) => showArchived || series.status !== "archived");

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

  function openPublicationDialog(recipe, series) {
    setPublicationNotice("");
    setPublicationTarget({ recipe, series });
  }

  async function savePublication(input) {
    const existingPublication = publicationsByVersionId[input.versionId];
    const saved = await onSavePublication(input);
    if (!saved) return null;

    const target = publicationTarget;
    let statusLabel = "非公開で保存しました";
    if (saved.status === "published") {
      statusLabel = "公開しました";
    } else if (existingPublication) {
      statusLabel = "非公開にしました";
    }
    setPublicationNotice(`${target.series.name} v${target.recipe.version} を${statusLabel}`);
    setPublicationTarget(null);
    return saved;
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
            {showArchived ? "Hide archived" : "Archived"}
          </button>
        </div>
      </div>
      {publicationLoadError && (
        <p className="inline-warning publication-message" role="alert">公開状態を読み込めませんでした。時間をおいて再度お試しください。</p>
      )}
      {publicationNotice && <p className="publication-message publication-notice" role="status">{publicationNotice}</p>}
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
                    {series.versions.map((recipe) => {
                      const publication = publicationsByVersionId[recipe.id];
                      const publicationUnavailable = publicationLoading || Boolean(publicationLoadError);
                      return (
                        <div className="version-row" key={recipe.id}>
                          <div>
                            <div className="version-title-line">
                              <strong>v{recipe.version}</strong>
                              {publication && (
                                <span className="status-pill publication-status" data-status={publication.status === "published" ? "visible" : "hidden"}>
                                  {publication.status === "published" ? "公開中" : "非公開"}
                                </span>
                              )}
                            </div>
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
                              className="publication-button"
                              type="button"
                              title={publicationUnavailable ? "公開状態を確認できません" : publication ? "公開設定を変更" : "このバージョンを公開"}
                              disabled={publicationUnavailable}
                              onClick={() => openPublicationDialog(recipe, series)}
                            >
                              {publication ? "公開設定" : "公開"}
                            </button>
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
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
      {publicationTarget && (
        <PublicationDialog
          key={publicationTarget.recipe.id}
          recipe={publicationTarget.recipe}
          series={publicationTarget.series}
          beans={beans}
          publication={publicationsByVersionId[publicationTarget.recipe.id] || null}
          saveError={publicationSaveError}
          saving={publishingVersionId === publicationTarget.recipe.id}
          onClose={() => setPublicationTarget(null)}
          onSave={savePublication}
        />
      )}
    </section>
  );
}

function PublicationDialog({ recipe, series, beans, publication, saveError, saving, onClose, onSave }) {
  const initialContent = publication?.content || "";
  const initialPublished = publication ? publication.status === "published" : true;
  const [content, setContent] = useState(initialContent);
  const [published, setPublished] = useState(initialPublished);
  const [submitted, setSubmitted] = useState(false);
  const normalizedContent = content.trim();
  const dirty = !publication || normalizedContent !== initialContent || published !== initialPublished;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    await onSave({
      versionId: recipe.id,
      content: normalizedContent,
      status: published ? "published" : "private",
    });
  }

  return (
    <div className="dialog-backdrop">
      <div className="master-dialog publication-dialog" role="dialog" aria-modal="true" aria-labelledby="publicationDialogTitle">
        <form className="master-dialog-form" onSubmit={handleSubmit}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">Discover</p>
              <h3 id="publicationDialogTitle">{publication ? "公開設定" : "ブレンドを公開"}</h3>
            </div>
          </div>
          <div className="publication-summary">
            <strong>{series.name} v{recipe.version}</strong>
            <span>{summarizeRecipe(recipe, beans)}</span>
          </div>
          <div className="publication-dialog-fields">
            <label htmlFor="publicationContent">投稿コメント（任意）</label>
            <textarea
              id="publicationContent"
              rows="5"
              maxLength="2000"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <span className="publication-character-count">{content.length} / 2000</span>
            <label className="publication-toggle" htmlFor="publicationStatus">
              <input
                id="publicationStatus"
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
              />
              <span>Discoverに公開</span>
            </label>
          </div>
          {submitted && saveError && (
            <p className="inline-warning publication-message" role="alert">公開設定を保存できませんでした。時間をおいて再度お試しください。</p>
          )}
          <div className="button-row dialog-actions">
            <button className="ghost-button" type="button" disabled={saving} onClick={onClose}>キャンセル</button>
            <button className="primary-button" type="submit" disabled={saving || !dirty}>
              {publicationActionLabel({ publication, initialPublished, published, saving })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function publicationActionLabel({ publication, initialPublished, published, saving }) {
  if (saving) return "保存中...";
  if (!publication) return published ? "公開する" : "非公開で保存";
  if (initialPublished && !published) return "非公開にする";
  if (!initialPublished && published) return "再公開する";
  return "変更を保存";
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
