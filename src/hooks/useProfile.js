import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseProfileRepository } from "../data/supabaseProfileRepository.js";

export function useProfile({ profileRepository } = {}) {
  const profileRepositoryRef = useRef(null);
  if (!profileRepositoryRef.current) {
    profileRepositoryRef.current = profileRepository || createSupabaseProfileRepository();
  }

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setLoadError(null);
      try {
        const nextProfile = await profileRepositoryRef.current.getOwnProfile();
        if (cancelled) return;
        setProfile(nextProfile);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error);
        setProfile(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback(async (profileInput) => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const savedProfile = await profileRepositoryRef.current.saveOwnProfile(profileInput);
      setProfile(savedProfile);
      setSaveStatus("saved");
      return savedProfile;
    } catch (error) {
      setSaveError(error);
      setSaveStatus("error");
      return null;
    }
  }, []);

  return {
    profile,
    loading,
    loadError,
    saveError,
    saveStatus,
    saveProfile,
  };
}
