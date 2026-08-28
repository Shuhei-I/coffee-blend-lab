import React, { useEffect, useRef, useState } from "react";
import { getRoastLevelLabel } from "../domain/coffee/roast.js";
import { useDiscoverPost } from "../hooks/useDiscoverPost.js";
import { useDiscoverInteractions } from "../hooks/useDiscoverInteractions.js";
import { ActionNotice } from "./ActionNotice.jsx";

export function DiscoverPostDetail({
  postId,
  discoverRepository,
  interactionRepository,
  isAuthenticated = false,
  onCopyBrewMethod,
  onCopyBlend,
  onOpenCopiedBlend,
  onLogin,
  onClose,
}) {
  const detail = useDiscoverPost({ postId, discoverRepository });
  const interactions = useDiscoverInteractions({ postId, interactionRepository, isAuthenticated, onLogin });
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose?.();
  }

  function handleCancel(event) {
    event.preventDefault();
    onClose?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className="discover-dialog"
      aria-labelledby="discoverDialogTitle"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="discover-dialog-shell">
        <header className="discover-dialog-header">
          <h2 id="discoverDialogTitle">公開ブレンド詳細</h2>
          <button className="discover-dialog-close" type="button" aria-label="閉じる" title="閉じる" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="discover-dialog-content">
          {detail.loading ? (
            <p className="discover-state" role="status">公開ブレンドを読み込んでいます...</p>
          ) : detail.error ? (
            <div className="discover-state" role="alert">
              <p>公開ブレンドを読み込めませんでした。</p>
              <button className="ghost-button" type="button" onClick={detail.retry}>再試行</button>
            </div>
          ) : !detail.post ? (
            <div className="discover-state">
              <p>公開ブレンドが見つかりませんでした。</p>
            </div>
          ) : (
            <DiscoverPostArticle
              post={detail.post}
              onCopyBrewMethod={onCopyBrewMethod}
              onCopyBlend={onCopyBlend}
              onOpenCopiedBlend={onOpenCopiedBlend}
              onLogin={onLogin}
              interactions={interactions}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

function DiscoverPostArticle({ post, onCopyBrewMethod, onCopyBlend, onOpenCopiedBlend, onLogin, interactions }) {
  const [copyStatus, setCopyStatus] = useState("idle");
  const [blendCopyStatus, setBlendCopyStatus] = useState("idle");
  const [copiedBlend, setCopiedBlend] = useState(null);
  const displayName = post.author.displayName || post.author.username || "Coffee Explorer";
  const initial = Array.from(displayName)[0]?.toUpperCase() || "C";
  const brewFacts = buildBrewFacts(post.blend.brew);
  const pourSteps = buildPourSteps(post.blend.brew);
  const canCopyBrewMethod = Boolean(post.blend.brew?.method && (onCopyBrewMethod || onLogin));

  async function copyBrewMethod() {
    if (copyStatus === "saving" || copyStatus === "saved") return;
    if (!onCopyBrewMethod) {
      onLogin?.();
      return;
    }

    setCopyStatus("saving");
    try {
      const saved = await onCopyBrewMethod(post.blend.brew.method);
      setCopyStatus(saved ? "saved" : "error");
    } catch {
      setCopyStatus("error");
    }
  }

  async function copyBlend() {
    if (blendCopyStatus === "saving" || blendCopyStatus === "saved") return;
    if (!onCopyBlend) {
      onLogin?.();
      return;
    }

    setBlendCopyStatus("saving");
    try {
      const copied = await onCopyBlend(post.postId);
      if (!copied) {
        setBlendCopyStatus("error");
        return;
      }
      setCopiedBlend(copied);
      setBlendCopyStatus("saved");
    } catch {
      setBlendCopyStatus("error");
    }
  }

  return (
    <article className="discover-detail">
      <header className="discover-card-header discover-detail-author-row">
        <div className="discover-author">
          <span className="discover-avatar" aria-hidden="true">{initial}</span>
          <div>
            <strong>{displayName}</strong>
            {post.author.username && <span>@{post.author.username}</span>}
          </div>
        </div>
        <time dateTime={post.publishedAt}>{formatPublishedAt(post.publishedAt)}</time>
      </header>

      {post.content && <p className="discover-comment discover-detail-comment">{post.content}</p>}

      <DiscoverEngagement interactions={interactions} onLogin={onLogin} />

      <div className="discover-detail-heading">
        <p className="eyebrow">Blend</p>
        <h1 id="discoverDetailTitle">{post.blend.name} <span>v{post.blend.version}</span></h1>
        {post.blend.goal && <p>{post.blend.goal}</p>}
      </div>

      <section className="discover-detail-section" aria-labelledby="discoverBeansTitle">
        <h2 id="discoverBeansTitle">豆の配合</h2>
        <div className="discover-bean-list">
          {post.blend.beans.map((bean, index) => (
            <div className="discover-bean-row discover-detail-bean-row" key={`${bean.name}-${index}`}>
              <span className="discover-bean-name">
                <span>{bean.name}</span>
                {bean.roastLevel && <small>焙煎: {getRoastLevelLabel(bean.roastLevel)}</small>}
              </span>
              <span className="discover-ratio-track" aria-hidden="true">
                <span style={{ width: `${clampRatio(bean.ratio)}%` }} />
              </span>
              <strong>{formatRatio(bean.ratio)}%</strong>
            </div>
          ))}
        </div>
      </section>

      {brewFacts.length > 0 && (
        <section className="discover-detail-section" aria-labelledby="discoverBrewTitle">
          <h2 id="discoverBrewTitle">抽出条件</h2>
          <dl className="discover-brew-facts">
            {brewFacts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {canCopyBrewMethod && (
            <div className="discover-brew-copy-action">
              <button
                className="ghost-button"
                type="button"
                disabled={copyStatus === "saving" || copyStatus === "saved"}
                onClick={copyBrewMethod}
              >
                {copyStatus === "saving" ? "追加中..." : copyStatus === "saved" ? "追加済み" : "自分の淹れ方に追加"}
              </button>
              {copyStatus === "saved" && <p role="status">淹れ方マスタに追加しました。</p>}
              {copyStatus === "error" && <p className="inline-warning" role="alert">追加できませんでした。もう一度お試しください。</p>}
            </div>
          )}
        </section>
      )}

      {pourSteps.length > 0 && (
        <section className="discover-detail-section" aria-labelledby="discoverPourTitle">
          <h2 id="discoverPourTitle">注湯レシピ</h2>
          <ol className="discover-pour-list">
            {pourSteps.map((step) => (
              <li key={step.label}>
                <strong>{step.label}</strong>
                <span>{formatNumber(step.percent)}%</span>
                {step.gram !== null && <span>{formatNumber(step.gram)}g</span>}
                {step.seconds !== null && <span>{formatNumber(step.seconds)}秒</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {(onCopyBlend || onLogin) && (
        <footer className="discover-detail-actions">
          {blendCopyStatus === "saved" ? (
            <ActionNotice
              message={`「${copiedBlend?.series?.name || `${post.blend.name}（コピー）`}」を履歴に追加しました。`}
              actionLabel="編集を始める"
              onAction={() => onOpenCopiedBlend?.(copiedBlend)}
            />
          ) : (
            <button className="primary-button" type="button" disabled={blendCopyStatus === "saving"} onClick={copyBlend}>
              {blendCopyStatus === "saving" ? "追加中..." : "自分のブレンドに追加"}
            </button>
          )}
          {blendCopyStatus === "error" && <p className="inline-warning" role="alert">追加できませんでした。もう一度お試しください。</p>}
        </footer>
      )}
    </article>
  );
}

function DiscoverEngagement({ interactions, onLogin }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState("");

  async function submitComment(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    const saved = await interactions.createComment(draft);
    if (saved) setDraft("");
  }

  async function saveEdit(commentId) {
    const saved = await interactions.updateComment(commentId, editingDraft);
    if (saved) {
      setEditingId(null);
      setEditingDraft("");
    }
  }

  return (
    <section className="discover-engagement" aria-labelledby="discoverEngagementTitle">
      <div className="discover-engagement-toolbar">
        <h2 id="discoverEngagementTitle">反応</h2>
        <button
          className={`discover-like-button${interactions.likedByViewer ? " is-liked" : ""}`}
          type="button"
          aria-label="いいね"
          aria-pressed={interactions.likedByViewer}
          disabled={interactions.action === "like"}
          onClick={interactions.toggleLike}
        >
          {interactions.likedByViewer ? "♥" : "♡"} {interactions.likeCount}
        </button>
        <span className="discover-comment-count">コメント {interactions.commentCount}</span>
      </div>

      {interactions.loading ? (
        <p className="discover-state" role="status">反応を読み込んでいます...</p>
      ) : interactions.error ? (
        <div className="discover-engagement-error" role="alert">
          <span>反応を読み込めませんでした。</span>
          <button className="ghost-button" type="button" onClick={interactions.retry}>再試行</button>
        </div>
      ) : null}

      <div className="discover-comment-list">
        {interactions.comments.map((comment) => (
          <article className={`discover-comment-item${comment.status === "hidden" ? " is-hidden" : ""}`} key={comment.commentId}>
            <header>
              <strong>{comment.author.displayName}</strong>
              {comment.author.username && <span>@{comment.author.username}</span>}
              <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
            </header>
            {editingId === comment.commentId ? (
              <>
                <textarea value={editingDraft} onChange={(event) => setEditingDraft(event.target.value)} maxLength={2000} />
                <div className="discover-comment-actions">
                  <button className="primary-button" type="button" disabled={interactions.action === "comment" || !editingDraft.trim()} onClick={() => saveEdit(comment.commentId)}>保存</button>
                  <button className="ghost-button" type="button" onClick={() => setEditingId(null)}>キャンセル</button>
                </div>
              </>
            ) : (
              <p>{comment.content}{comment.status === "hidden" && <small>（非表示）</small>}</p>
            )}
            {editingId !== comment.commentId && (comment.isAuthor || comment.canHide) && (
              <div className="discover-comment-actions">
                {comment.isAuthor && <button className="text-button" type="button" onClick={() => { setEditingId(comment.commentId); setEditingDraft(comment.content); }}>編集</button>}
                {comment.isAuthor && <button className="text-button" type="button" onClick={() => interactions.deleteComment(comment.commentId)}>削除</button>}
                {comment.canHide && <button className="text-button" type="button" onClick={() => interactions.hideComment(comment.commentId)}>非表示</button>}
              </div>
            )}
          </article>
        ))}
      </div>

      {interactions.comments.length === 0 && !interactions.loading && !interactions.error && (
        <p className="discover-empty-comments">まだコメントはありません。</p>
      )}

      {!interactions.isAuthenticated && onLogin && !interactions.loading ? (
        <button className="primary-button" type="button" onClick={onLogin}>ログインしてコメント</button>
      ) : interactions.isAuthenticated && !interactions.loading ? (
        <form className="discover-comment-form" onSubmit={submitComment}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            placeholder="コメントを入力"
            aria-label="コメント"
            disabled={interactions.action === "comment"}
          />
          <button className="primary-button" type="submit" disabled={interactions.action === "comment" || !draft.trim()}>
            コメントを投稿
          </button>
        </form>
      ) : null}
    </section>
  );
}

function formatCommentDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short" }).format(new Date(value));
  } catch {
    return "";
  }
}

function buildBrewFacts(brew) {
  if (!brew) return [];
  const facts = [];
  if (brew.method?.name) facts.push(["淹れ方", brew.method.name]);
  if (brew.method?.extractionType) facts.push(["抽出方式", formatExtractionType(brew.method.extractionType)]);
  if (brew.method?.equipmentName) facts.push(["使用器具", brew.method.equipmentName]);
  if (brew.grindSize) facts.push(["挽き目", formatGrindSize(brew.grindSize)]);
  if (isPresent(brew.temperatureC)) facts.push(["湯温", `${formatNumber(brew.temperatureC)}℃`]);
  if (isPresent(brew.doseGram)) facts.push(["粉量", `${formatNumber(brew.doseGram)}g`]);
  if (isPresent(brew.targetBrewGram)) facts.push(["抽出量", `${formatNumber(brew.targetBrewGram)}g`]);
  if (isPresent(brew.brewRatio)) facts.push(["抽出比率", `1:${formatNumber(brew.brewRatio)}`]);
  if (isPresent(brew.totalBrewSeconds)) facts.push(["抽出時間", formatDuration(brew.totalBrewSeconds)]);
  return facts;
}

function buildPourSteps(brew) {
  if (!brew?.method) return [];
  const targetGram = brew.targetBrewGram;
  return [
    ["蒸らし", brew.method.bloomPercent, brew.method.bloomSeconds],
    ["1投目", brew.method.pour1Percent, null],
    ["2投目", brew.method.pour2Percent, null],
    ["3投目", brew.method.pour3Percent, null],
  ].filter(([, percent]) => Number(percent) > 0).map(([label, percent, seconds]) => ({
    label,
    percent,
    seconds,
    gram: isPresent(targetGram) ? Math.round((targetGram * Number(percent)) / 100) : null,
  }));
}

function formatExtractionType(value) {
  return {
    pour_over: "ドリップ",
    immersion: "浸漬",
    pressure: "加圧",
    vacuum: "サイフォン",
    other: "その他",
  }[value] || value;
}

function formatGrindSize(value) {
  return {
    fine: "細挽き",
    medium_fine: "中細挽き",
    medium: "中挽き",
    medium_coarse: "中粗挽き",
    coarse: "粗挽き",
  }[value] || value;
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}分${remainder}秒` : `${remainder}秒`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function isPresent(value) {
  return value !== null && value !== undefined && value !== "";
}

function clampRatio(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function formatRatio(value) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatPublishedAt(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "";
  }
}
