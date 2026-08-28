import React from "react";
import { useDiscoverTimeline } from "../hooks/useDiscoverTimeline.js";

export function DiscoverTimeline({ discoverRepository, interactionRepository, hidden = false, onLogin, onOpenPost }) {
  const timeline = useDiscoverTimeline({ discoverRepository, interactionRepository });

  return (
    <section className="discover-page" aria-labelledby="discoverTitle" hidden={hidden}>
      <header className="discover-heading">
        <div>
          <p className="eyebrow">Discover</p>
          <h1 id="discoverTitle">公開ブレンド</h1>
          <p className="discover-order-label">新着順</p>
        </div>
        {onLogin && (
          <button className="primary-button discover-login-button" type="button" onClick={onLogin}>
            ブレンドを公開する
          </button>
        )}
      </header>

      {timeline.loading ? (
        <p className="discover-state" role="status">公開ブレンドを読み込んでいます...</p>
      ) : timeline.error && timeline.posts.length === 0 ? (
        <div className="discover-state" role="alert">
          <p>公開ブレンドを読み込めませんでした。</p>
          <button className="ghost-button" type="button" onClick={timeline.retry}>再試行</button>
        </div>
      ) : timeline.posts.length === 0 ? (
        <p className="discover-state">まだ公開ブレンドはありません。</p>
      ) : (
        <>
          <div className="discover-feed">
            {timeline.posts.map((post) => (
              <DiscoverCard
                key={post.postId}
                post={post}
                onOpen={(trigger) => onOpenPost?.(post.postId, trigger)}
              />
            ))}
          </div>
          {timeline.error && (
            <p className="inline-warning discover-page-error" role="alert">次の公開ブレンドを読み込めませんでした。</p>
          )}
          {timeline.hasMore && (
            <button className="ghost-button discover-more-button" type="button" disabled={timeline.loadingMore} onClick={timeline.loadMore}>
              {timeline.loadingMore ? "読み込み中..." : "さらに読み込む"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

export default DiscoverTimeline;

function DiscoverCard({ post, onOpen }) {
  const displayName = post.author.displayName || post.author.username || "Coffee Explorer";
  const initial = Array.from(displayName)[0]?.toUpperCase() || "C";
  const visibleBeans = post.blend.beans.slice(0, 3);
  const hiddenBeanCount = Math.max(0, post.blend.beans.length - visibleBeans.length);

  return (
    <article className="discover-card">
      <header className="discover-card-header">
        <div className="discover-author">
          <span className="discover-avatar" aria-hidden="true">{initial}</span>
          <div>
            <strong>{displayName}</strong>
            {post.author.username && <span>@{post.author.username}</span>}
          </div>
        </div>
        <time dateTime={post.publishedAt}>{formatPublishedAt(post.publishedAt)}</time>
      </header>

      <div className="discover-blend-heading">
        <div>
          <p className="eyebrow">Blend</p>
          <h2>{post.blend.name} <span>v{post.blend.version}</span></h2>
        </div>
        {onOpen && (
          <button
            className="discover-open-button"
            type="button"
            aria-label={`「${post.blend.name} v${post.blend.version}」の詳細を見る`}
            title="詳細を見る"
            onClick={(event) => onOpen(event.currentTarget)}
          >
            <span aria-hidden="true">›</span>
          </button>
        )}
      </div>

      {post.content && <p className="discover-comment">{post.content}</p>}

      <div className="discover-composition" aria-label={buildCompositionLabel(post.blend.beans)}>
        <span className="discover-composition-bar" aria-hidden="true">
          {post.blend.beans.map((bean, index) => (
            <span key={`${bean.name}-${index}`} style={{ width: `${clampRatio(bean.ratio)}%` }} />
          ))}
        </span>
        <div className="discover-composition-legend">
          {visibleBeans.map((bean, index) => (
            <span key={`${bean.name}-${index}`}>
              <i aria-hidden="true" />
              <span>{bean.name}</span>
              <strong>{formatRatio(bean.ratio)}%</strong>
            </span>
          ))}
          {hiddenBeanCount > 0 && <span className="discover-more-beans">ほか{hiddenBeanCount}種</span>}
        </div>
      </div>

      <div className="discover-card-engagement" aria-label="Post engagement">
        <span aria-label={`Likes ${post.engagement?.likeCount || 0}`}>♡ {post.engagement?.likeCount || 0}</span>
        <span aria-label={`Comments ${post.engagement?.commentCount || 0}`}>コメント {post.engagement?.commentCount || 0}</span>
      </div>
    </article>
  );
}

function buildCompositionLabel(beans) {
  return beans.map((bean) => `${bean.name} ${formatRatio(bean.ratio)}%`).join("、");
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
