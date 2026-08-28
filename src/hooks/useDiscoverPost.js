import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseDiscoverTimelineRepository } from "../data/supabaseDiscoverTimelineRepository.js";

export function useDiscoverPost({ postId, discoverRepository } = {}) {
  const repositoryRef = useRef(null);
  if (!repositoryRef.current) {
    repositoryRef.current = discoverRepository || createSupabaseDiscoverTimelineRepository();
  }

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(Boolean(postId));
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!postId) {
      setPost(null);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setPost(null);
    setError(null);
    setLoading(true);

    repositoryRef.current.getDiscoverPost(postId).then((result) => {
      if (!active) return;
      setPost(result);
      setLoading(false);
    }).catch((nextError) => {
      if (!active) return;
      setError(nextError);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [postId, retryKey]);

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);

  return { post, loading, error, retry };
}
