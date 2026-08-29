import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseDiscoverRepository } from "../data/supabaseDiscoverRepository.js";

export function useDiscoverPublishing({ versionIds = [], discoverRepository } = {}) {
  const repositoryRef = useRef(null);
  if (!repositoryRef.current) {
    repositoryRef.current = discoverRepository || createSupabaseDiscoverRepository();
  }

  const normalizedVersionIds = [...new Set(versionIds.filter(Boolean))].sort();
  const versionIdsKey = normalizedVersionIds.join(",");
  const [publicationsByVersionId, setPublicationsByVersionId] = useState({});
  const [loading, setLoading] = useState(normalizedVersionIds.length > 0);
  const [loadedVersionIdsKey, setLoadedVersionIdsKey] = useState(normalizedVersionIds.length > 0 ? null : "");
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savingVersionId, setSavingVersionId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPublications() {
      if (normalizedVersionIds.length === 0) {
        setPublicationsByVersionId({});
        setLoading(false);
        setLoadError(null);
        setLoadedVersionIdsKey("");
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const publications = await repositoryRef.current.getOwnPostsForVersions(normalizedVersionIds);
        if (cancelled) return;
        setPublicationsByVersionId(indexPublications(publications));
      } catch (error) {
        if (cancelled) return;
        setPublicationsByVersionId({});
        setLoadError(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedVersionIdsKey(versionIdsKey);
        }
      }
    }

    loadPublications();
    return () => {
      cancelled = true;
    };
  }, [versionIdsKey]);

  const savePublication = useCallback(async ({ versionId, content = "", status = "published", includeBeanDetails = false }) => {
    setSavingVersionId(versionId);
    setSaveError(null);
    try {
      const result = await repositoryRef.current.publishRecipeVersion({ versionId, content, status, includeBeanDetails });
      const publication = { ...result, versionId, content, includeBeanDetails: includeBeanDetails === true };
      setPublicationsByVersionId((current) => ({ ...current, [versionId]: publication }));
      return publication;
    } catch (error) {
      setSaveError(error);
      return null;
    } finally {
      setSavingVersionId(null);
    }
  }, []);

  return {
    publicationsByVersionId,
    loading: loading || loadedVersionIdsKey !== versionIdsKey,
    loadError,
    saveError,
    savingVersionId,
    savePublication,
  };
}

function indexPublications(publications) {
  return Object.fromEntries(publications.map((publication) => [publication.versionId, publication]));
}
