import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseDiscoverTimelineRepository } from "../data/supabaseDiscoverTimelineRepository.js";

export function useDiscoverTimeline({ discoverRepository, interactionRepository } = {}) {
  const repositoryRef = useRef(null);
  const interactionRepositoryRef = useRef(interactionRepository || null);
  if (!repositoryRef.current) {
    repositoryRef.current = discoverRepository || createSupabaseDiscoverTimelineRepository();
  }

  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadPage(repositoryRef.current, interactionRepositoryRef.current);
      setPosts(result.posts);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
      return result;
    } catch (nextError) {
      setPosts([]);
      setCursor(null);
      setHasMore(false);
      setError(nextError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await loadPage(repositoryRef.current, interactionRepositoryRef.current);
      if (!active) return;
      setPosts(result.posts);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setError(null);
      setLoading(false);
    }

    load().catch((nextError) => {
      if (!active) return;
      setPosts([]);
      setCursor(null);
      setHasMore(false);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loadingMore) return null;

    setLoadingMore(true);
    setError(null);
    try {
      const result = await loadPage(repositoryRef.current, interactionRepositoryRef.current, { cursor });
      setPosts((current) => mergePosts(current, result.posts));
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
      return result;
    } catch (nextError) {
      setError(nextError);
      return null;
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  return {
    posts,
    hasMore,
    loading,
    loadingMore,
    error,
    retry: loadInitial,
    loadMore,
  };
}

async function loadPage(repository, interactionRepository, options) {
  const result = await repository.listDiscoverPosts(options);
  if (!interactionRepository || result.posts.length === 0) return result;

  try {
    const engagements = await interactionRepository.getEngagement(result.posts.map((post) => post.postId));
    return {
      ...result,
      posts: result.posts.map((post) => ({
        ...post,
        engagement: engagements.get(post.postId) || emptyEngagement(),
      })),
    };
  } catch {
    return result;
  }
}

function emptyEngagement() {
  return { likeCount: 0, commentCount: 0, likedByViewer: false };
}

function mergePosts(current, next) {
  const seen = new Set(current.map((post) => post.postId));
  return [...current, ...next.filter((post) => !seen.has(post.postId))];
}
