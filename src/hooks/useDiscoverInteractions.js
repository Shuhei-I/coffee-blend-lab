import { useCallback, useEffect, useRef, useState } from "react";

export function useDiscoverInteractions({ postId, interactionRepository, isAuthenticated = false, onLogin } = {}) {
  const repositoryRef = useRef(interactionRepository || null);
  const [engagement, setEngagement] = useState(emptyEngagement());
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(Boolean(postId && repositoryRef.current));
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const refresh = useCallback(async () => {
    if (!postId || !repositoryRef.current) {
      setEngagement(emptyEngagement());
      setComments([]);
      return;
    }
    const [nextEngagement, nextComments] = await Promise.all([
      repositoryRef.current.getEngagement([postId]),
      repositoryRef.current.listComments(postId),
    ]);
    setEngagement(nextEngagement.get(postId) || emptyEngagement());
    setComments(nextComments);
  }, [postId]);

  useEffect(() => {
    let active = true;
    if (!postId || !repositoryRef.current) {
      setLoading(false);
      setError(null);
      setEngagement(emptyEngagement());
      setComments([]);
      return () => { active = false; };
    }

    setLoading(true);
    setError(null);
    refresh().then(() => {
      if (active) setLoading(false);
    }).catch((nextError) => {
      if (!active) return;
      setError(nextError);
      setLoading(false);
    });

    return () => { active = false; };
  }, [postId, refresh, retryKey]);

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);

  const toggleLike = useCallback(async () => {
    if (!isAuthenticated) {
      onLogin?.();
      return false;
    }
    if (!repositoryRef.current || action === "like") return false;
    setAction("like");
    try {
      await repositoryRef.current.setLike(postId, !engagement.likedByViewer);
      const next = await repositoryRef.current.getEngagement([postId]);
      setEngagement(next.get(postId) || emptyEngagement());
      return true;
    } catch (nextError) {
      setError(nextError);
      return false;
    } finally {
      setAction(null);
    }
  }, [action, engagement.likedByViewer, isAuthenticated, onLogin, postId]);

  const mutateComment = useCallback(async (operation, ...args) => {
    if (!isAuthenticated) {
      onLogin?.();
      return false;
    }
    if (!repositoryRef.current || action === "comment") return false;
    setAction("comment");
    try {
      await operation(...args);
      await refresh();
      setError(null);
      return true;
    } catch (nextError) {
      setError(nextError);
      return false;
    } finally {
      setAction(null);
    }
  }, [action, isAuthenticated, onLogin, refresh]);

  return {
    ...engagement,
    comments,
    loading,
    error,
    action,
    isAuthenticated,
    retry,
    toggleLike,
    createComment: (content) => mutateComment(repositoryRef.current?.createComment, postId, content),
    updateComment: (commentId, content) => mutateComment(repositoryRef.current?.updateComment, commentId, content),
    deleteComment: (commentId) => mutateComment(repositoryRef.current?.deleteComment, commentId),
    hideComment: (commentId) => mutateComment(repositoryRef.current?.hideComment, commentId),
  };
}

function emptyEngagement() {
  return { likeCount: 0, commentCount: 0, likedByViewer: false };
}
