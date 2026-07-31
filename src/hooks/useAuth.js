import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useAuth({ client = supabase } = {}) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initializationError, setInitializationError] = useState(null);
  const [isInitializingUser, setIsInitializingUser] = useState(false);
  const initializedUsersRef = useRef(new Set());
  const initializationAttemptsRef = useRef(new Set());

  const applySession = useCallback((nextSession) => {
    setSession(nextSession || null);
    if (!nextSession) {
      setInitializationError(null);
      setIsInitializingUser(false);
      return;
    }

    const userId = nextSession.user?.id;
    if (userId && !initializedUsersRef.current.has(userId) && !initializationAttemptsRef.current.has(userId)) {
      setInitializationError(null);
      setIsInitializingUser(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (cancelled) return;
        if (sessionError) {
          setError(toSafeMessage(sessionError));
          applySession(null);
          return;
        }
        applySession(data?.session || null);
      })
      .catch((sessionError) => {
        if (cancelled) return;
        setError(toSafeMessage(sessionError));
        applySession(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession || null);
    });

    return () => {
      cancelled = true;
      data?.subscription?.unsubscribe?.();
    };
  }, [applySession, client]);

  const initializeUser = useCallback(
    async (userId, { force = false } = {}) => {
      if (!userId) return;
      if (!force && (initializedUsersRef.current.has(userId) || initializationAttemptsRef.current.has(userId))) {
        return;
      }

      initializationAttemptsRef.current.add(userId);
      setIsInitializingUser(true);
      setInitializationError(null);

      const { error: rpcError } = await client.rpc("initialize_user_defaults");
      if (rpcError) {
        setInitializationError(toSafeMessage(rpcError));
        setIsInitializingUser(false);
        return;
      }

      initializedUsersRef.current.add(userId);
      setInitializationError(null);
      setIsInitializingUser(false);
    },
    [client],
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;
    initializeUser(userId).catch((rpcError) => {
      if (cancelled) return;
      setInitializationError(toSafeMessage(rpcError));
      setIsInitializingUser(false);
    });

    return () => {
      cancelled = true;
    };
  }, [initializeUser, session?.user?.id]);

  const signUp = useCallback(
    async (email, password) => {
      setError(null);
      const { data, error: signUpError } = await client.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      if (signUpError) {
        const message = toSafeMessage(signUpError);
        setError(message);
        return { ok: false, error: message };
      }
      applySession(data?.session || null);
      return { ok: true, emailConfirmationRequired: !data?.session };
    },
    [applySession, client],
  );

  const signIn = useCallback(
    async (email, password) => {
      setError(null);
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (signInError) {
        const message = toSafeMessage(signInError);
        setError(message);
        return { ok: false, error: message };
      }
      applySession(data?.session || null);
      return { ok: true };
    },
    [applySession, client],
  );

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      const message = toSafeMessage(signOutError);
      setError(message);
      return { ok: false, error: message };
    }
    applySession(null);
    return { ok: true };
  }, [applySession, client]);

  const retryInitializeUser = useCallback(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    initializationAttemptsRef.current.delete(userId);
    initializeUser(userId, { force: true }).catch((rpcError) => {
      setInitializationError(toSafeMessage(rpcError));
      setIsInitializingUser(false);
    });
  }, [initializeUser, session?.user?.id]);

  return {
    session,
    user: session?.user || null,
    loading,
    error,
    initializationError,
    isInitializingUser,
    signUp,
    signIn,
    signOut,
    retryInitializeUser,
    clearError: () => setError(null),
  };
}

function toSafeMessage(error) {
  if (!error) return "";
  return typeof error.message === "string" ? error.message : String(error);
}
