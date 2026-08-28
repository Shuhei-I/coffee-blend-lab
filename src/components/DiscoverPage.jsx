import React, { useEffect, useRef, useState } from "react";
import { buildDiscoverUrl, readDiscoverPostId } from "../domain/discover/navigation.js";
import { DiscoverPostDetail } from "./DiscoverPostDetail.jsx";
import { DiscoverTimeline } from "./DiscoverTimeline.jsx";

export function DiscoverPage({ discoverRepository, interactionRepository, isAuthenticated = false, currentUserId = null, onLogin, onCopyBrewMethod, onCopyBlend, onOpenCopiedBlend }) {
  const initialPostId = readPostId();
  const [postId, setPostId] = useState(initialPostId);
  const [timelineMounted, setTimelineMounted] = useState(!initialPostId);
  const detailTriggerRef = useRef(null);

  useEffect(() => {
    function handlePopState() {
      const nextPostId = readPostId();
      setPostId(nextPostId);
      if (!nextPostId) setTimelineMounted(true);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (postId || !detailTriggerRef.current) return;
    const trigger = detailTriggerRef.current;
    const focusTimer = window.setTimeout(() => trigger.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [postId]);

  function openPost(nextPostId, trigger) {
    detailTriggerRef.current = trigger || null;
    updatePostUrl(nextPostId, "pushState");
    setTimelineMounted(true);
    setPostId(nextPostId);
  }

  function closePost() {
    updatePostUrl(null, "replaceState");
    setTimelineMounted(true);
    setPostId(null);
  }

  function openCopiedBlend(copiedBlend) {
    updatePostUrl(null, "replaceState");
    setPostId(null);
    onOpenCopiedBlend?.(copiedBlend);
  }

  return (
    <>
      {timelineMounted && (
        <DiscoverTimeline
          discoverRepository={discoverRepository}
          interactionRepository={interactionRepository}
          hidden={Boolean(postId)}
          onLogin={onLogin}
          onOpenPost={openPost}
        />
      )}
      {postId && (
        <DiscoverPostDetail
          postId={postId}
          discoverRepository={discoverRepository}
          interactionRepository={interactionRepository}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onCopyBrewMethod={onCopyBrewMethod}
          onCopyBlend={onCopyBlend}
          onOpenCopiedBlend={openCopiedBlend}
          onLogin={onLogin}
          onClose={closePost}
        />
      )}
    </>
  );
}

export default DiscoverPage;

function readPostId() {
  if (typeof window === "undefined") return null;
  return readDiscoverPostId(window.location.search);
}

function updatePostUrl(postId, method) {
  window.history[method](
    window.history.state,
    "",
    buildDiscoverUrl(window.location.href, postId),
  );
}
